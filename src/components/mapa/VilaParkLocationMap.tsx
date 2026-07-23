/**
 * VilaParkLocationMap — mapa premium da home (seção Entorno).
 * Design monocromático (grafite + cobre no empreendimento), lazy load,
 * filtros por categoria e raios de caminhada de 500 m / 1 km.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMap, { Marker, Popup, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Building2, MapPin, Train, Trees, GraduationCap, ShoppingBag, UtensilsCrossed } from "lucide-react";
import {
  POIS,
  VILA_PARK_COORDS,
  VILA_PARK_ADDRESS,
  CATEGORY_ORDER,
  type Poi,
  type PoiCategory,
} from "@/data/surroundings";
import { useBasemapStyle } from "@/lib/basemap";

const ICON: Record<PoiCategory, typeof Train> = {
  mobility: Train,
  leisure: Trees,
  education: GraduationCap,
  services: ShoppingBag,
  gastronomy: UtensilsCrossed,
};

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

const RING_500: LayerProps = {
  id: "ring-500",
  type: "line",
  paint: {
    "line-color": "hsl(215, 30%, 15%)",
    "line-width": 1,
    "line-opacity": 0.6,
    "line-dasharray": [2, 3],
  },
};
const RING_1000: LayerProps = {
  id: "ring-1000",
  type: "line",
  paint: {
    "line-color": "hsl(215, 30%, 15%)",
    "line-width": 1,
    "line-opacity": 0.45,
    "line-dasharray": [2, 3],
  },
};

function MapContent() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Poi | null>(null);
  const [showBuilding, setShowBuilding] = useState(false);
  const [filters, setFilters] = useState<PoiCategory[]>([...CATEGORY_ORDER]);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const mapRef = useRef<any>(null);

  const visible = useMemo(() => POIS.filter((p) => filters.includes(p.category)), [filters]);

  const ring500 = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [circleFeature(VILA_PARK_COORDS, 500)] }),
    [],
  );
  const ring1000 = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [circleFeature(VILA_PARK_COORDS, 1000)] }),
    [],
  );

  const toggle = (c: PoiCategory) =>
    setFilters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const allActive = filters.length === CATEGORY_ORDER.length;

  const catLabel = (c: PoiCategory) => t(`surroundings.${c}`);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("map.filters.aria")}>
        <button
          type="button"
          onClick={() => setFilters([...CATEGORY_ORDER])}
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
          const on = filters.includes(c) && !allActive;
          const onWhenAll = filters.includes(c);
          const active = on || (allActive && false);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={onWhenAll}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
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

      <div
        className="relative w-full rounded-[10px] border border-border/70 overflow-hidden card-elevated bg-muted"
        style={{ height: 460 }}
      >
        <div className="md:hidden absolute inset-0" style={{ height: "100%" }} />
        <div className="hidden md:block absolute inset-0" style={{ height: 540 }} />
        <div className="relative w-full h-[460px] md:h-[540px]">
          <ReactMap
            ref={mapRef}
            initialViewState={{ longitude: VILA_PARK_COORDS.lng, latitude: VILA_PARK_COORDS.lat, zoom: 14.6 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={MAP_STYLE}
            minZoom={12}
            maxZoom={18}
            scrollZoom={scrollUnlocked}
            onClick={() => {
              if (!scrollUnlocked) setScrollUnlocked(true);
            }}
            cooperativeGestures={typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {/* Anéis de caminhada */}
            <Source id="ring-500-src" type="geojson" data={ring500}>
              <Layer {...RING_500} />
            </Source>
            <Source id="ring-1000-src" type="geojson" data={ring1000}>
              <Layer {...RING_1000} />
            </Source>

            {/* Rótulos dos anéis (marcadores DOM discretos) */}
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat + 500 / 111320} anchor="bottom">
              <span className="pointer-events-none select-none text-[10px] uppercase tracking-[0.14em] font-medium text-foreground/60 bg-background/85 px-1.5 py-0.5 rounded">
                {t("map.radius.500")}
              </span>
            </Marker>
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat + 1000 / 111320} anchor="bottom">
              <span className="pointer-events-none select-none text-[10px] uppercase tracking-[0.14em] font-medium text-foreground/60 bg-background/85 px-1.5 py-0.5 rounded">
                {t("map.radius.1000")}
              </span>
            </Marker>

            {/* Empreendimento */}
            <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="bottom">
              <button
                type="button"
                onClick={() => setShowBuilding(true)}
                aria-label={`Vila Park — ${VILA_PARK_ADDRESS}`}
                className="relative flex items-center justify-center"
              >
                <span
                  className="absolute inset-0 rounded-full bg-accent/40 motion-safe:animate-ping"
                  aria-hidden
                />
                <span
                  className="relative w-11 h-11 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Building2 size={20} className="text-white" strokeWidth={2} />
                </span>
              </button>
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

            {/* POIs — monocromático grafite */}
            {visible.map((poi) => {
              const Icon = ICON[poi.category];
              return (
                <Marker key={poi.name} longitude={poi.lng} latitude={poi.lat} anchor="bottom">
                  <button
                    type="button"
                    onClick={() => setActive(poi)}
                    aria-label={`${poi.name} — ${catLabel(poi.category)}, ${poi.distance}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center border border-white shadow hover:scale-110 transition-transform"
                    style={{ backgroundColor: "hsl(var(--primary))" }}
                  >
                    <Icon size={11} className="text-primary-foreground" strokeWidth={2.25} />
                  </button>
                </Marker>
              );
            })}

            {active && (
              <Popup
                longitude={active.lng}
                latitude={active.lat}
                anchor="top"
                onClose={() => setActive(null)}
                closeButton
              >
                <div className="min-w-[160px]">
                  <p className="font-display text-sm font-semibold text-foreground">{active.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {catLabel(active.category)} · {active.distance}
                  </p>
                </div>
              </Popup>
            )}
          </ReactMap>
        </div>
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
