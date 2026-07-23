/**
 * VilaParkLocationMap — mapa premium da home (seção Entorno).
 *
 * Layout imobiliário: lista scrollável à esquerda + mapa à direita (lg+),
 * carrossel horizontal snap no mobile. Sincronização bidirecional
 * lista <-> pin, rótulos permanentes para POIs até 1,2 km, linha de
 * conexão tracejada até o POI selecionado, enquadramento inteligente
 * (fitBounds por filtros) e link "Como chegar" no popup.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMap, { Marker, Popup, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Building2,
  MapPin,
  Train,
  Trees,
  GraduationCap,
  ShoppingBag,
  UtensilsCrossed,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  POIS,
  VILA_PARK_COORDS,
  VILA_PARK_ADDRESS,
  CATEGORY_ORDER,
  type Poi,
  type PoiCategory,
} from "@/data/surroundings";
import { useBasemapStyle, useBasemapContrast } from "@/lib/basemap";
import { logBasemap, registerBasemapMap, unregisterBasemapMap } from "@/lib/basemapLog";
import { trackGlobal } from "@/hooks/useGuideAnalytics";

const ICON: Record<PoiCategory, typeof Train> = {
  mobility: Train,
  leisure: Trees,
  education: GraduationCap,
  services: ShoppingBag,
  gastronomy: UtensilsCrossed,
};

// "950 m" -> 950 ; "1,4 km" -> 1400 ; "1 km" -> 1000
function distanceMeters(d: string): number {
  const norm = d.replace(",", ".").toLowerCase().trim();
  const num = parseFloat(norm);
  if (Number.isNaN(num)) return Infinity;
  return norm.includes("km") ? Math.round(num * 1000) : Math.round(num);
}

const NEARBY_LIMIT_M = 1200;

// Envelope padrão dos eventos de analytics deste componente.
// Mantido enxuto para agregações no relatório: sempre `location` + `component`.
const ANALYTICS_BASE = {
  location: "home:comparativo",
  component: "VilaParkLocationMap",
} as const;

// Identificador estável do POI, derivado do nome (sem acentos, kebab-case).
// Ex.: "Parque da Aclimação" -> "parque-da-aclimacao".
function poiId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Payload consistente para qualquer evento que se refere a um POI.
function poiEventPayload(poi: Poi) {
  return {
    poi_id: poiId(poi.name),
    poi_name: poi.name,
    category: poi.category,
    distance_label: poi.distance,
    distance_m: distanceMeters(poi.distance),
  };
}

// Payload consistente para eventos de filtro.
function filterEventPayload(filters: PoiCategory[]) {
  const sorted = [...filters].sort();
  return {
    filters: sorted,
    filters_count: sorted.length,
    filters_key: sorted.join(","),
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Círculo geodésico aproximado (equirretangular local — suficiente para <5 km)
function circleFeature(center: { lat: number; lng: number }, radiusMeters: number, points = 96) {
  const coords: [number, number][] = [];
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos(latRad));
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([center.lng + dLng * Math.cos(theta), center.lat + dLat * Math.sin(theta)]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

function boundsFor(points: Array<{ lat: number; lng: number }>): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLat = points[0].lat,
    maxLat = points[0].lat,
    minLng = points[0].lng,
    maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function directionsUrl(poi: Poi): string {
  const o = `${VILA_PARK_COORDS.lat},${VILA_PARK_COORDS.lng}`;
  const d = `${poi.lat},${poi.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=walking`;
}

const RING_500_HALO: LayerProps = {
  id: "ring-500-halo",
  type: "line",
  paint: { "line-color": "#fff", "line-width": 3.5, "line-opacity": 0.85, "line-blur": 0.5 },
};
const RING_500: LayerProps = {
  id: "ring-500",
  type: "line",
  paint: {
    "line-color": "hsl(215, 30%, 15%)",
    "line-width": 1.25,
    "line-opacity": 0.75,
    "line-dasharray": [2, 3],
  },
};
const RING_1000_HALO: LayerProps = {
  id: "ring-1000-halo",
  type: "line",
  paint: { "line-color": "#fff", "line-width": 3.5, "line-opacity": 0.85, "line-blur": 0.5 },
};
const RING_1000: LayerProps = {
  id: "ring-1000",
  type: "line",
  paint: {
    "line-color": "hsl(215, 30%, 15%)",
    "line-width": 1.25,
    "line-opacity": 0.6,
    "line-dasharray": [2, 3],
  },
};

const CONNECTION_HALO: LayerProps = {
  id: "connection-halo",
  type: "line",
  paint: { "line-color": "#fff", "line-width": 4, "line-opacity": 0.75, "line-blur": 0.4 },
};
const CONNECTION_LINE: LayerProps = {
  id: "connection-line",
  type: "line",
  paint: {
    "line-color": "hsl(var(--accent))",
    "line-width": 1.75,
    "line-opacity": 0.95,
    "line-dasharray": [2, 2.2],
  },
};

function MapContent() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Poi | null>(null);
  const [showBuilding, setShowBuilding] = useState(false);
  const [filters, setFilters] = useState<PoiCategory[]>([...CATEGORY_ORDER]);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [showFullRadius, setShowFullRadius] = useState(false);
  const { style: mapStyle, onError: onMapError } = useBasemapStyle("VilaParkLocationMap");
  const mapRef = useRef<any>(null);
  const contrast = useBasemapContrast(mapRef, mapStyle);

  const listRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Deduplicação de eventos de analytics.
  // Evita ruído quando o usuário reclica no mesmo POI, alterna o mesmo filtro
  // repetidamente ou quando o mapa reconcilia estado após reidratação.
  const analyticsDedupRef = useRef<Map<string, number>>(new Map());
  const emitAnalytics = useCallback(
    (event: string, payload: Record<string, unknown>, dedupKey: string, windowMs = 1500) => {
      const now = Date.now();
      const key = `${event}::${dedupKey}`;
      const last = analyticsDedupRef.current.get(key) ?? 0;
      if (now - last < windowMs) return;
      analyticsDedupRef.current.set(key, now);
      trackGlobal(event, { ...payload, dedup_key: dedupKey });
    },
    [],
  );

  const allActive = filters.length === CATEGORY_ORDER.length;
  const visible = useMemo(() => POIS.filter((p) => filters.includes(p.category)), [filters]);

  const grouped = useMemo(() => {
    const map = new Map<PoiCategory, Poi[]>();
    for (const c of CATEGORY_ORDER) {
      const items = visible.filter((p) => p.category === c);
      if (items.length) map.set(c, items);
    }
    return map;
  }, [visible]);

  const ring500 = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [circleFeature(VILA_PARK_COORDS, 500)] }),
    [],
  );
  const ring1000 = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [circleFeature(VILA_PARK_COORDS, 1000)] }),
    [],
  );

  const connectionData = useMemo(() => {
    if (!active) return { type: "FeatureCollection" as const, features: [] };
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [VILA_PARK_COORDS.lng, VILA_PARK_COORDS.lat],
              [active.lng, active.lat],
            ],
          },
          properties: {},
        },
      ],
    };
  }, [active]);

  const midpoint = useMemo(() => {
    if (!active) return null;
    return {
      lng: (VILA_PARK_COORDS.lng + active.lng) / 2,
      lat: (VILA_PARK_COORDS.lat + active.lat) / 2,
    };
  }, [active]);

  // Enquadramento
  const applyBounds = useCallback(
    (points: Array<{ lat: number; lng: number }>, opts?: { padding?: number }) => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      const b = boundsFor(points);
      if (!b) return;
      const reduced = prefersReducedMotion();
      map.fitBounds(b, {
        padding: opts?.padding ?? 80,
        maxZoom: 15.6,
        duration: reduced ? 0 : 700,
      });
    },
    [],
  );

  const fitInitial = useCallback(() => {
    const nearby = POIS.filter((p) => distanceMeters(p.distance) <= NEARBY_LIMIT_M);
    applyBounds([VILA_PARK_COORDS, ...nearby], { padding: 70 });
  }, [applyBounds]);

  // fit inicial ao carregar
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!mapReady) return;
    if (showFullRadius) {
      applyBounds([VILA_PARK_COORDS, ...POIS], { padding: 60 });
    } else {
      fitInitial();
    }
  }, [mapReady, showFullRadius, fitInitial, applyBounds]);

  // fit quando filtros mudam (exceto todos ativos que preserva estado)
  useEffect(() => {
    if (!mapReady) return;
    if (allActive) return;
    if (visible.length === 0) return;
    applyBounds([VILA_PARK_COORDS, ...visible], { padding: 70 });
  }, [filters, allActive, visible, mapReady, applyBounds]);

  const focusPoi = useCallback((poi: Poi, opts?: { scrollList?: boolean; source?: "list" | "pin" | "carousel" }) => {
    setActive(poi);
    setShowBuilding(false);
    const source = opts?.source ?? "list";
    emitAnalytics(
      "map_poi_select",
      {
        ...ANALYTICS_BASE,
        ...poiEventPayload(poi),
        ...filterEventPayload(filters),
        source,
      },
      `poi:${poiId(poi.name)}:${source}`,
    );
    const map = mapRef.current?.getMap?.();
    if (map) {
      const reduced = prefersReducedMotion();
      const camera = { center: [poi.lng, poi.lat] as [number, number], zoom: 15.6 };
      if (reduced) map.jumpTo(camera);
      else map.flyTo({ ...camera, duration: 700, essential: true });
    }
    if (opts?.scrollList) {
      const el = itemRefs.current.get(poi.name);
      el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  }, [filters, emitAnalytics]);

  const toggle = (c: PoiCategory) =>
    setFilters((prev) => {
      const wasActive = prev.includes(c);
      const next = wasActive ? prev.filter((x) => x !== c) : [...prev, c];
      const action = wasActive ? "off" : "on";
      emitAnalytics(
        "map_filter_toggle",
        {
          ...ANALYTICS_BASE,
          category: c,
          filter_action: action,
          ...filterEventPayload(next),
        },
        `filter:${c}:${action}`,
      );
      return next;
    });

  const catLabel = (c: PoiCategory) => t(`surroundings.${c}`);

  // Rótulos permanentes para POIs próximos
  const isNearby = (p: Poi) => distanceMeters(p.distance) <= NEARBY_LIMIT_M;

  // Anchor baseado em lng relativo ao Vila Park (evita label sair do quadro no lado errado)
  const labelAnchor = (p: Poi): "left" | "right" =>
    p.lng >= VILA_PARK_COORDS.lng ? "left" : "right";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("map.filters.aria")}>
        <button
          type="button"
          onClick={() => {
            setFilters([...CATEGORY_ORDER]);
            emitAnalytics(
              "map_filter_reset",
              { ...ANALYTICS_BASE, ...filterEventPayload(CATEGORY_ORDER) },
              "filter:reset",
            );
          }}
          aria-pressed={allActive}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            allActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:border-foreground/40"
          }`}
        >
          {t("map.filters.all")}
        </button>
        {CATEGORY_ORDER.map((c) => {
          const Icon = ICON[c];
          const isOn = filters.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                isOn && !allActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-foreground/40"
              }`}
            >
              <Icon size={12} strokeWidth={2} />
              {catLabel(c)}
            </button>
          );
        })}
      </div>

      {/* GRID: lista (lg) + mapa */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Lista (desktop) */}
        <div
          ref={listRef}
          className="hidden lg:block h-[540px] overflow-y-auto rounded-[10px] border border-border/70 bg-background card-elevated"
          aria-label={t("map.list.aria")}
        >
          <ul className="divide-y divide-border/50">
            {[...grouped.entries()].map(([cat, items]) => {
              const Icon = ICON[cat];
              return (
                <li key={cat}>
                  <div className="sticky top-0 z-[1] bg-background/95 backdrop-blur px-4 pt-3 pb-2 border-b border-border/50">
                    <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent">
                      <Icon size={12} strokeWidth={2.25} />
                      {catLabel(cat)}
                    </p>
                  </div>
                  <ul>
                    {items.map((poi) => {
                      const isActive = active?.name === poi.name;
                      return (
                        <li key={poi.name}>
                          <button
                            ref={(el) => {
                              if (el) itemRefs.current.set(poi.name, el);
                              else itemRefs.current.delete(poi.name);
                            }}
                            type="button"
                            onClick={() => focusPoi(poi, { source: "list" })}
                            onMouseEnter={() => setActive(poi)}
                            onFocus={() => setActive(poi)}
                            aria-pressed={isActive}
                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                              isActive ? "bg-accent/10" : "hover:bg-muted/60"
                            }`}
                          >
                            <span className="text-sm text-foreground truncate">{poi.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{poi.distance}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-8 text-sm text-muted-foreground text-center">{t("map.list.empty")}</li>
            )}
          </ul>
        </div>

        {/* Mapa */}
        <div className="relative w-full h-[460px] md:h-[540px] rounded-[10px] border border-border/70 overflow-hidden card-elevated bg-muted">
          <ReactMap
            ref={mapRef}
            initialViewState={{ longitude: VILA_PARK_COORDS.lng, latitude: VILA_PARK_COORDS.lat, zoom: 14.6 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={mapStyle}
            minZoom={12}
            maxZoom={18}
            scrollZoom={scrollUnlocked}
            {...({ preserveDrawingBuffer: true } as any)}
            onLoad={(event) => {
              event.target.resize();
              registerBasemapMap("VilaParkLocationMap", event.target as any, mapStyle);
              logBasemap({ event: "map_load", component: "VilaParkLocationMap", style: mapStyle });
              event.target.once?.("idle", () =>
                logBasemap({ event: "map_idle_first", component: "VilaParkLocationMap", style: mapStyle }),
              );
              setMapReady(true);
            }}
            onRemove={() => unregisterBasemapMap("VilaParkLocationMap")}
            onClick={() => {
              if (!scrollUnlocked) setScrollUnlocked(true);
            }}
            onError={onMapError}
            cooperativeGestures={typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {/* Anéis */}
            <Source id="ring-500-src" type="geojson" data={ring500}>
              <Layer
                {...(RING_500_HALO as any)}
                paint={{
                  ...((RING_500_HALO as any).paint),
                  "line-color": contrast.ringHalo,
                  "line-opacity": contrast.ringHaloOpacity,
                }}
              />
              <Layer
                {...(RING_500 as any)}
                paint={{
                  ...((RING_500 as any).paint),
                  "line-color": contrast.ringMain,
                  "line-opacity": contrast.ringMainOpacity,
                }}
              />
            </Source>
            <Source id="ring-1000-src" type="geojson" data={ring1000}>
              <Layer
                {...(RING_1000_HALO as any)}
                paint={{
                  ...((RING_1000_HALO as any).paint),
                  "line-color": contrast.ringHalo,
                  "line-opacity": contrast.ringHaloOpacity,
                }}
              />
              <Layer
                {...(RING_1000 as any)}
                paint={{
                  ...((RING_1000 as any).paint),
                  "line-color": contrast.ringMain,
                  "line-opacity": Math.max(0.5, contrast.ringMainOpacity - 0.15),
                }}
              />
            </Source>

            {/* Linha de conexão até POI selecionado */}
            {active && (
              <Source id="connection-src" type="geojson" data={connectionData}>
                <Layer {...(CONNECTION_HALO as any)} />
                <Layer {...(CONNECTION_LINE as any)} />
              </Source>
            )}

            {/* Rótulos dos anéis */}
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat + 500 / 111320} anchor="bottom">
              <span
                className="pointer-events-none select-none text-[10px] uppercase tracking-[0.14em] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: contrast.labelBg, color: contrast.labelFg }}
              >
                {t("map.radius.500")}
              </span>
            </Marker>
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat + 1000 / 111320} anchor="bottom">
              <span
                className="pointer-events-none select-none text-[10px] uppercase tracking-[0.14em] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: contrast.labelBg, color: contrast.labelFg }}
              >
                {t("map.radius.1000")}
              </span>
            </Marker>

            {/* Rótulo da distância no ponto médio da conexão */}
            {midpoint && active && (
              <Marker longitude={midpoint.lng} latitude={midpoint.lat} anchor="center">
                <span
                  className="pointer-events-none select-none text-[10.5px] font-medium px-2 py-0.5 rounded-full border border-border/70 bg-background/95 shadow-sm tabular-nums text-foreground"
                >
                  {active.distance}
                </span>
              </Marker>
            )}

            {/* Empreendimento — pin + rótulo permanente Fraunces */}
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="bottom">
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setShowBuilding(true);
                }}
                aria-label={`Vila Park — ${VILA_PARK_ADDRESS}`}
                className="relative flex items-center justify-center"
              >
                <span className="absolute inset-0 rounded-full bg-accent/40 motion-safe:animate-ping" aria-hidden />
                <span
                  className="relative w-11 h-11 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Building2 size={20} className="text-white" strokeWidth={2} />
                </span>
              </button>
            </Marker>
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="left" offset={[22, -8]}>
              <span
                className="pointer-events-none select-none font-display text-[12px] font-medium px-2 py-0.5 rounded-full shadow-sm border border-white/10"
                style={{ backgroundColor: "hsl(215 30% 15%)", color: "#fff" }}
              >
                Vila Park
              </span>
            </Marker>

            {showBuilding && (
              <Popup
                longitude={VILA_PARK_COORDS.lng}
                latitude={VILA_PARK_COORDS.lat}
                anchor="top"
                onClose={() => setShowBuilding(false)}
                closeButton
              >
                <div className="min-w-[180px]">
                  <p className="font-display text-sm font-semibold text-foreground">Vila Park</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{VILA_PARK_ADDRESS}</p>
                </div>
              </Popup>
            )}

            {/* POIs + rótulos (permanentes se ≤1,2 km, sob demanda para os demais) */}
            {visible.map((poi) => {
              const Icon = ICON[poi.category];
              const isActive = active?.name === poi.name;
              const showLabel = isNearby(poi) || isActive;
              const anchor = labelAnchor(poi);
              const labelOffset: [number, number] = anchor === "left" ? [10, -2] : [-10, -2];
              return (
                <div key={poi.name}>
                  <Marker longitude={poi.lng} latitude={poi.lat} anchor="bottom">
                    <button
                      type="button"
                      onClick={() => focusPoi(poi, { scrollList: true, source: "pin" })}
                      aria-label={`${poi.name} — ${catLabel(poi.category)}, ${poi.distance}`}
                      className={`rounded-full flex items-center justify-center border border-white shadow transition-transform ${
                        isActive
                          ? "w-7 h-7 ring-2 ring-accent ring-offset-1 ring-offset-background scale-110"
                          : "w-6 h-6 hover:scale-110"
                      }`}
                      style={{ backgroundColor: "hsl(var(--primary))" }}
                    >
                      <Icon size={isActive ? 12 : 11} className="text-primary-foreground" strokeWidth={2.25} />
                    </button>
                  </Marker>
                  {showLabel && (
                    <Marker longitude={poi.lng} latitude={poi.lat} anchor={anchor} offset={labelOffset}>
                      <span
                        className="pointer-events-none select-none text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/70 bg-background/90 shadow-sm text-foreground whitespace-nowrap tabular-nums"
                      >
                        {poi.name} · {poi.distance}
                      </span>
                    </Marker>
                  )}
                </div>
              );
            })}

            {active && (
              <Popup
                longitude={active.lng}
                latitude={active.lat}
                anchor="top"
                onClose={() => setActive(null)}
                closeButton
                offset={14}
              >
                <div className="min-w-[180px]">
                  <p className="font-display text-sm font-semibold text-foreground">{active.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {catLabel(active.category)} · {active.distance}
                  </p>
                  <a
                    href={directionsUrl(active)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-accent hover:underline"
                  >
                    {t("map.popup.directions")}
                    <ExternalLink size={11} strokeWidth={2} />
                  </a>
                </div>
              </Popup>
            )}
          </ReactMap>

          {/* Botão "Ver raio completo / Voltar ao entorno" */}
          <button
            type="button"
            onClick={() =>
              setShowFullRadius((v) => {
                const next = !v;
                trackGlobal("map_bounds_toggle", {
                  ...ANALYTICS_BASE,
                  mode: next ? "full_radius" : "nearby",
                  ...filterEventPayload(filters),
                });
                return next;
              })
            }
            className="absolute bottom-3 left-3 z-[2] inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-border/70 bg-background/95 backdrop-blur shadow-sm text-foreground hover:border-foreground/40 transition-colors"
          >
            {showFullRadius ? <Minimize2 size={12} strokeWidth={2} /> : <Maximize2 size={12} strokeWidth={2} />}
            {showFullRadius ? t("map.bounds.back") : t("map.bounds.full")}
          </button>
        </div>
      </div>

      {/* Carrossel horizontal (mobile) */}
      <div
        ref={carouselRef}
        className="lg:hidden -mx-5 px-5 flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2"
        role="list"
        aria-label={t("map.list.aria")}
      >
        {visible.map((poi) => {
          const Icon = ICON[poi.category];
          const isActive = active?.name === poi.name;
          return (
            <button
              key={poi.name}
              type="button"
              onClick={() => focusPoi(poi, { source: "carousel" })}
              aria-pressed={isActive}
              role="listitem"
              className={`snap-start shrink-0 min-w-[190px] max-w-[220px] text-left rounded-[10px] border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive ? "border-accent bg-accent/10" : "border-border/70 bg-background hover:border-foreground/40"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                <Icon size={11} strokeWidth={2.25} />
                {catLabel(poi.category)}
              </span>
              <span className="mt-1 block text-sm text-foreground line-clamp-1">{poi.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">{poi.distance}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-3xl">
        {t("map.disclaimer")}
      </p>
    </div>
  );
}

export default function VilaParkLocationMap() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!visible) {
    return (
      <div
        ref={sentinelRef}
        className="w-full h-[460px] md:h-[540px] rounded-[10px] border border-border/70 bg-muted flex flex-col items-center justify-center gap-2"
        aria-hidden
      >
        <MapPin size={28} className="text-muted-foreground/40" strokeWidth={1.5} />
        <div className="h-3 w-3 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return <MapContent />;
}
