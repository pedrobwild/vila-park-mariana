/**
 * Embeddable version of the Mapa de Bairros dashboard.
 * Can be used standalone (MapaBairros page) or embedded as a section in Index.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Train, Calendar, DollarSign, TrendingUp,
  X, Clock, Wallet, Calculator, Flame, ArrowUpDown, CircleDot, Layers,
} from "lucide-react";
import {
  Neighborhood, MetroStation, CityEvent, NEIGHBORHOODS, METRO_STATIONS, EVENTS,
  DEMAND_FILTERS, EVENT_ICONS, IMPACT_STYLES, TAG_ICONS, scoreColor, fmt,
  POI_CATEGORIES, POI_COLORS, type POICategoryKey,
} from "@/data/mapaBairrosData";
import ROIRanking from "@/components/mapa/ROIRanking";
import NeighborhoodComparison from "@/components/mapa/NeighborhoodComparison";
import ReactMap, { Marker, Popup, NavigationControl, Source, Layer, MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* ─── ROI Simulator ─── */
function ROISimulator({ neighborhood, onClose }: { neighborhood: Neighborhood; onClose: () => void }) {
  const [nightly, setNightly] = useState([neighborhood.avgNightly]);
  const [occupancy, setOccupancy] = useState([neighborhood.avgOccupancy]);
  const [cleaning, setCleaning] = useState([80]);
  const [platformFee, setPlatformFee] = useState([15]);
  const [fixedCosts, setFixedCosts] = useState([2200]);
  const [investment, setInvestment] = useState([45000]);

  const result = useMemo(() => {
    const monthlyRevenue = nightly[0] * 30 * (occupancy[0] / 100);
    const platformCost = monthlyRevenue * (platformFee[0] / 100);
    const avgStays = Math.ceil((30 * occupancy[0] / 100) / 3);
    const totalCleaning = cleaning[0] * avgStays;
    const monthlyProfit = monthlyRevenue - platformCost - totalCleaning - fixedCosts[0];
    const annualProfit = monthlyProfit * 12;
    const roi = investment[0] > 0 ? (annualProfit / investment[0]) * 100 : 0;
    const payback = annualProfit > 0 ? investment[0] / annualProfit : 0;
    return { monthlyRevenue, monthlyProfit, annualProfit, roi, payback };
  }, [nightly, occupancy, cleaning, platformFee, fixedCosts, investment]);

  const sliders = [
    { label: "Diária média", value: nightly, set: setNightly, min: 100, max: 800, step: 10, prefix: "R$", suffix: "" },
    { label: "Ocupação", value: occupancy, set: setOccupancy, min: 40, max: 100, step: 1, prefix: "", suffix: "%" },
    { label: "Limpeza/estadia", value: cleaning, set: setCleaning, min: 40, max: 200, step: 10, prefix: "R$", suffix: "" },
    { label: "Taxa plataforma", value: platformFee, set: setPlatformFee, min: 3, max: 25, step: 1, prefix: "", suffix: "%" },
    { label: "Custos fixos/mês", value: fixedCosts, set: setFixedCosts, min: 800, max: 5000, step: 100, prefix: "R$", suffix: "" },
    { label: "Investimento inicial", value: investment, set: setInvestment, min: 10000, max: 150000, step: 5000, prefix: "R$", suffix: "" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 40, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-display text-lg font-bold text-foreground">Simulador ROI</h3>
          <p className="text-sm text-muted-foreground font-body">{neighborhood.name}</p>
        </motion.div>
        <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
      </div>
      <div className="space-y-4">
        {sliders.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex justify-between text-xs font-body mb-1.5">
              <span className="text-muted-foreground">{s.label}</span>
              <motion.span key={s.value[0]} initial={{ scale: 1.15, color: "hsl(var(--primary))" }} animate={{ scale: 1, color: "hsl(var(--foreground))" }} className="font-semibold">{s.prefix}{fmt(s.value[0])}{s.suffix}</motion.span>
            </div>
            <Slider value={s.value} onValueChange={s.set} min={s.min} max={s.max} step={s.step} className="w-full" />
          </motion.div>
        ))}
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Receita mensal", value: `R$ ${fmt(result.monthlyRevenue)}`, icon: DollarSign, positive: true },
          { label: "Lucro mensal", value: `R$ ${fmt(result.monthlyProfit)}`, icon: Wallet, positive: result.monthlyProfit > 0 },
          { label: "ROI anual", value: `${result.roi.toFixed(1)}%`, icon: TrendingUp, positive: result.roi > 0 },
          { label: "Payback estimado", value: result.payback > 0 ? `${result.payback.toFixed(1)} anos` : "—", icon: Clock, positive: result.payback > 0 && result.payback < 5 },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.04, y: -2 }}
          >
            <Card className={`border overflow-hidden relative ${card.positive ? "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-destructive/20 bg-destructive/5"}`}>
              <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 ${card.positive ? "bg-gradient-to-br from-emerald-500/5 to-transparent" : "bg-gradient-to-br from-destructive/5 to-transparent"}`} />
              <CardContent className="p-3 text-center relative">
                <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}>
                  <card.icon size={16} className={`mx-auto mb-1 ${card.positive ? "text-emerald-600" : "text-destructive"}`} />
                </motion.div>
                <p className={`text-lg font-bold font-display ${card.positive ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{card.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Neighborhood Card ─── */
function NeighborhoodCard({ n, isSelected, isHighlighted, onClick, index = 0 }: { n: Neighborhood; isSelected: boolean; isHighlighted: boolean; onClick: () => void; index?: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.88, filter: "blur(4px)" }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        onClick={onClick}
        className={`cursor-pointer transition-all duration-300 overflow-hidden relative group ${
          isSelected ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10" : isHighlighted ? "ring-2 ring-amber-400 border-amber-400 shadow-md shadow-amber-400/10" : "border-border hover:shadow-lg hover:border-primary/30"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-bold text-foreground">{n.name}</h3>
            <div className="flex items-center gap-1.5">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${scoreColor(n.score)}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <span className="text-xs font-bold font-mono text-foreground">{n.score}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-body mb-1.5">
            <span>R$ {n.avgNightly}/noite</span>
            <span>{n.avgOccupancy}% ocup.</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{n.metrics.estimatedROI}% ROI</span>
          </div>
          <p className="text-[9px] text-muted-foreground font-body mb-2.5">
            ~{fmt(n.metrics.activeListings)} studios no Airbnb · R${fmt(n.metrics.nightlyRateRange[0])}–R${fmt(n.metrics.nightlyRateRange[1])}/noite · R${fmt(n.metrics.avgRevenueMo)}/mês
          </p>
          <div className="flex flex-wrap gap-1">
            {n.tags.slice(0, 4).map((tag) => {
              const Icon = TAG_ICONS[tag] || MapPin;
              return (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon size={8} />{tag}
                </span>
              );
            })}
            {n.tags.length > 4 && <span className="text-[10px] text-muted-foreground">+{n.tags.length - 4}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const MAP_STYLE = "https://api.maptiler.com/maps/019cc06d-fb8e-741d-b158-a17a30e87c08/style.json?key=AI17dHeoeJx6rUC1KlSL";
const SP_BOUNDS: [[number, number], [number, number]] = [[-46.82, -23.68], [-46.55, -23.45]];

/* ─── Interactive Map ─── */
function InteractiveMap({
  neighborhoods, stations, showMetro, showHeatmap, showClusters, showPOIs, selected, highlightedNames, onSelect,
}: {
  neighborhoods: Neighborhood[]; stations: MetroStation[]; showMetro: boolean; showHeatmap: boolean; showClusters: boolean;
  showPOIs: POICategoryKey[];
  selected: Neighborhood | null; highlightedNames: string[]; onSelect: (n: Neighborhood) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredN, setHoveredN] = useState<Neighborhood | null>(null);
  const [hoveredPoly, setHoveredPoly] = useState<{ name: string; roi: number; rate: number; occ: number; rev: number; priceSqm: number; lng: number; lat: number } | null>(null);
  const [hoveredStation, setHoveredStation] = useState<{ name: string; line: string; lng: number; lat: number } | null>(null);
  const [poisGeoJSON, setPoisGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredPOI, setHoveredPOI] = useState<{ name: string; category: string; neighborhood: string; lng: number; lat: number } | null>(null);

  useEffect(() => {
    fetch("/geo/pois.geojson")
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        setPoisGeoJSON(geojson);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selected) return;
    mapRef.current.flyTo({ center: [selected.centerLng, selected.centerLat], zoom: 14, duration: 800 });
  }, [selected]);

  const onPolygonHover = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const f = e.features[0];
      const p = f.properties;
      setHoveredPoly({
        name: p?.name || "", roi: p?.estimatedROI || 0, rate: p?.nightlyRate || 0,
        occ: p?.occupancy || 0, rev: p?.revenueMonth || 0, priceSqm: p?.priceSqm || 0, lng: e.lngLat.lng, lat: e.lngLat.lat,
      });
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const onPolygonLeave = useCallback(() => {
    setHoveredPoly(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
  }, []);

  const onPolygonClick = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const name = e.features[0].properties?.name;
      const n = NEIGHBORHOODS.find((nb) => nb.name === name);
      if (n) onSelect(n);
    }
  }, [onSelect]);

  const onMetroHover = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const p = e.features[0].properties;
      setHoveredStation({ name: p?.name || "", line: p?.line || "", lng: e.lngLat.lng, lat: e.lngLat.lat });
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const onMetroLeave = useCallback(() => {
    setHoveredStation(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
  }, []);

  const onClusterClick = useCallback((e: MapLayerMouseEvent) => {
    if (!mapRef.current || !e.features?.length) return;
    const feature = e.features[0];
    const clusterId = feature.properties?.cluster_id;
    const source = mapRef.current.getSource("clusters-source") as GeoJSONSource;
    if (source && clusterId != null) {
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = feature.geometry as GeoJSON.Point;
        mapRef.current!.easeTo({ center: geom.coordinates as [number, number], zoom, duration: 500 });
      });
    }
  }, []);

  const onPOIHover = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const p = e.features[0].properties;
      setHoveredPOI({ name: p?.name || "", category: p?.category || "", neighborhood: p?.neighborhood || "", lng: e.lngLat.lng, lat: e.lngLat.lat });
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const onPOILeave = useCallback(() => {
    setHoveredPOI(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
  }, []);

  const onPOIClusterClick = useCallback((e: MapLayerMouseEvent) => {
    if (!mapRef.current || !e.features?.length) return;
    const feature = e.features[0];
    const clusterId = feature.properties?.cluster_id;
    const source = mapRef.current.getSource("pois-clustered") as GeoJSONSource;
    if (source && clusterId != null) {
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = feature.geometry as GeoJSON.Point;
        mapRef.current!.easeTo({ center: geom.coordinates as [number, number], zoom: Math.min(zoom, 16), duration: 500 });
      });
    }
  }, []);

  return (
    <motion.div
      className="relative w-full aspect-square md:aspect-[4/3] rounded-xl border border-border overflow-hidden min-h-[320px]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <ReactMap
        ref={mapRef}
        initialViewState={{ longitude: -46.6333, latitude: -23.5505, zoom: 11 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        minZoom={10} maxZoom={17} maxBounds={SP_BOUNDS}
        interactiveLayerIds={["neighborhood-fill", "metro-stations-circle", "cluster-circles", "poi-unclustered", "poi-clusters"]}
        onMouseMove={(e) => {
          const polyFeatures = e.features?.filter((f) => f.layer?.id === "neighborhood-fill");
          const metroFeatures = e.features?.filter((f) => f.layer?.id === "metro-stations-circle");
          const poiFeatures = e.features?.filter((f) => f.layer?.id === "poi-unclustered");
          if (polyFeatures?.length) onPolygonHover({ ...e, features: polyFeatures } as MapLayerMouseEvent);
          else setHoveredPoly(null);
          if (metroFeatures?.length) onMetroHover({ ...e, features: metroFeatures } as MapLayerMouseEvent);
          else setHoveredStation(null);
          if (poiFeatures?.length) onPOIHover({ ...e, features: poiFeatures } as MapLayerMouseEvent);
          else setHoveredPOI(null);
        }}
        onMouseLeave={() => { onPolygonLeave(); onMetroLeave(); onPOILeave(); }}
        onClick={(e) => {
          const polyFeatures = e.features?.filter((f) => f.layer?.id === "neighborhood-fill");
          const clusterFeatures = e.features?.filter((f) => f.layer?.id === "cluster-circles");
          const poiClusterFeatures = e.features?.filter((f) => f.layer?.id === "poi-clusters");
          if (polyFeatures?.length) onPolygonClick({ ...e, features: polyFeatures } as MapLayerMouseEvent);
          if (clusterFeatures?.length) onClusterClick({ ...e, features: clusterFeatures } as MapLayerMouseEvent);
          if (poiClusterFeatures?.length) onPOIClusterClick({ ...e, features: poiClusterFeatures } as MapLayerMouseEvent);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Neighborhood polygons */}
        <Source id="neighborhoods-source" type="geojson" data="/geo/neighborhoods.geojson">
          <Layer id="neighborhood-fill" type="fill" paint={{
            "fill-color": ["case", [">=", ["get", "score"], 88], "rgba(34,197,94,0.25)", [">=", ["get", "score"], 84], "rgba(245,158,11,0.2)", "rgba(156,163,175,0.15)"],
            "fill-opacity": showHeatmap ? 0.12 : 0.3,
          }} />
          <Layer id="neighborhood-outline" type="line" paint={{
            "line-color": ["case", [">=", ["get", "score"], 88], "rgba(34,197,94,0.6)", [">=", ["get", "score"], 84], "rgba(245,158,11,0.5)", "rgba(156,163,175,0.3)"],
            "line-width": 2,
          }} />
        </Source>

        {/* Neighborhood pins */}
        {neighborhoods.map((n) => {
          const isSel = selected?.name === n.name;
          const isHigh = highlightedNames.includes(n.name);
          const bgClass = isSel ? "bg-primary" : isHigh ? "bg-amber-400" : n.score >= 88 ? "bg-green-500" : n.score >= 84 ? "bg-amber-500" : "bg-gray-400";
          return (
            <Marker key={n.id} longitude={n.centerLng} latitude={n.centerLat} anchor="center">
              <div onClick={() => onSelect(n)} onMouseEnter={() => setHoveredN(n)} onMouseLeave={() => setHoveredN(null)}
                className={`${bgClass} text-white rounded-full px-2 py-1 text-xs font-bold cursor-pointer transition-transform duration-200 hover:scale-[1.4] shadow-md ${isSel ? "ring-2 ring-primary/50 scale-110" : ""}`}>
                {n.score}
              </div>
            </Marker>
          );
        })}

        {hoveredN && (
          <Popup longitude={hoveredN.centerLng} latitude={hoveredN.centerLat} offset={16} closeButton={false} closeOnClick={false} anchor="bottom">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[12px] font-bold">{hoveredN.name}</div>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${hoveredN.score >= 88 ? "bg-emerald-500" : hoveredN.score >= 84 ? "bg-amber-500" : "bg-gray-400"}`}>
                Score {hoveredN.score}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">R${hoveredN.avgNightly}/noite · {hoveredN.avgOccupancy}% ocup.</div>
            <div className="text-[10px] text-muted-foreground">ROI est. {hoveredN.metrics.estimatedROI}% · ~{fmt(hoveredN.metrics.activeListings)} studios</div>
            {hoveredN.metrics.priceSqm > 0 && (
              <div className="text-[10px] text-muted-foreground">Preço/m² R${fmt(hoveredN.metrics.priceSqm)}</div>
            )}
            <div className="text-[9px] text-muted-foreground/60 mt-1">Clique para selecionar</div>
          </Popup>
        )}

        {hoveredPoly && !hoveredN && (
          <Popup longitude={hoveredPoly.lng} latitude={hoveredPoly.lat} offset={8} closeButton={false} closeOnClick={false} anchor="bottom">
            <div className="text-[11px] font-bold">{hoveredPoly.name}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
              <span>ROI est.</span><span className="font-semibold text-foreground">{hoveredPoly.roi}%</span>
              <span>Diária</span><span className="font-semibold text-foreground">R${hoveredPoly.rate}</span>
              <span>Ocupação</span><span className="font-semibold text-foreground">{hoveredPoly.occ}%</span>
              <span>Receita/mês</span><span className="font-semibold text-foreground">R${fmt(hoveredPoly.rev)}</span>
              {hoveredPoly.priceSqm > 0 && <><span>Preço/m²</span><span className="font-semibold text-foreground">R${fmt(hoveredPoly.priceSqm)}</span></>}
            </div>
          </Popup>
        )}

        {/* Metro */}
        {showMetro && (
          <>
            <Source id="metro-lines-source" type="geojson" data="/geo/metro-lines.geojson">
              <Layer id="metro-lines" type="line" paint={{ "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.6 }} />
            </Source>
            <Source id="metro-stations-source" type="geojson" data="/geo/metro-stations.geojson">
              <Layer id="metro-walk-radius" type="circle" paint={{
                "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 10, 3, 12, 12, 14, 48, 16, 192],
                "circle-color": ["get", "color"], "circle-opacity": 0.08, "circle-stroke-color": ["get", "color"], "circle-stroke-width": 1, "circle-stroke-opacity": 0.2,
              }} />
              <Layer id="metro-stations-circle" type="circle" paint={{ "circle-radius": 6, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 }} />
              <Layer id="metro-stations-label" type="symbol" layout={{ "text-field": ["get", "name"], "text-size": 10, "text-offset": [0, 1.5], "text-anchor": "top", "text-optional": true }}
                paint={{ "text-color": "#555", "text-halo-color": "#fff", "text-halo-width": 1.5 }} />
            </Source>
          </>
        )}

        {hoveredStation && (
          <Popup longitude={hoveredStation.lng} latitude={hoveredStation.lat} offset={12} closeButton={false} closeOnClick={false} anchor="bottom">
            <div className="text-[11px] font-bold">{hoveredStation.name}</div>
            <div className="text-[10px] text-muted-foreground">{hoveredStation.line}</div>
          </Popup>
        )}

        {/* Heatmap */}
        {showHeatmap && (
          <Source id="heatmap-source" type="geojson" data="/geo/heatmap-points.geojson">
            <Layer id="heatmap-layer" type="heatmap" paint={{
              "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 50, 0, 100, 1],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 2],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 20, 15, 40],
              "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.2, "rgba(103,169,207,0.4)", 0.4, "rgba(209,229,143,0.5)", 0.6, "rgba(253,219,49,0.6)", 0.8, "rgba(244,109,67,0.7)", 1, "rgba(215,48,39,0.8)"],
              "heatmap-opacity": 0.7,
            }} />
          </Source>
        )}

        {/* Clusters */}
        {showClusters && (
          <Source id="clusters-source" type="geojson" data="/geo/clusters.geojson" cluster clusterMaxZoom={14} clusterRadius={50}>
            <Layer id="cluster-circles" type="circle" filter={["has", "point_count"]} paint={{
              "circle-color": ["step", ["get", "point_count"], "rgba(34,197,94,0.7)", 5, "rgba(245,158,11,0.7)", 15, "rgba(239,68,68,0.7)"],
              "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 32], "circle-stroke-width": 2, "circle-stroke-color": "#fff",
            }} />
            <Layer id="cluster-count" type="symbol" filter={["has", "point_count"]} layout={{ "text-field": "{point_count_abbreviated}", "text-size": 12 }} paint={{ "text-color": "#fff" }} />
            <Layer id="unclustered-point" type="circle" filter={["!", ["has", "point_count"]]} paint={{ "circle-color": "rgba(34,197,94,0.6)", "circle-radius": 5, "circle-stroke-width": 1, "circle-stroke-color": "#fff" }} />
          </Source>
        )}

        {/* POIs as clustered native layers for performance */}
        {poisGeoJSON && showPOIs.length > 0 && (() => {
          // Filter features to only active categories
          const filteredGeoJSON: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: poisGeoJSON.features.filter(f =>
              showPOIs.includes((f.properties as any)?.category as POICategoryKey)
            ),
          };
          // Build a match expression for colors by category
          const colorExpr: any = ["match", ["get", "category"]];
          POI_CATEGORIES.forEach(c => { colorExpr.push(c.key, c.color); });
          colorExpr.push("#888"); // fallback

          return (
            <Source id="pois-clustered" type="geojson" data={filteredGeoJSON} cluster={true} clusterRadius={40} clusterMaxZoom={14}>
              {/* Cluster circles */}
              <Layer id="poi-clusters" type="circle" filter={["has", "point_count"]} paint={{
                "circle-color": "#1e3a5f",
                "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 10, 26],
                "circle-opacity": 0.85,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }} />
              {/* Cluster count labels */}
              <Layer id="poi-cluster-count" type="symbol" filter={["has", "point_count"]} layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }} paint={{ "text-color": "#fff" }} />
              {/* Individual POI points */}
              <Layer id="poi-unclustered" type="circle" filter={["!", ["has", "point_count"]]} paint={{
                "circle-color": colorExpr,
                "circle-radius": 6,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
                "circle-opacity": 0.9,
              }}
              />
            </Source>
          );
        })()}

        {hoveredPOI && (
          <Popup
            longitude={hoveredPOI.lng}
            latitude={hoveredPOI.lat}
            offset={14}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-foreground">{hoveredPOI.name}</p>
              <p className="text-muted-foreground mt-0.5">
                {POI_CATEGORIES.find(c => c.key === hoveredPOI.category)?.label ?? hoveredPOI.category}
                {" · "}{hoveredPOI.neighborhood}
              </p>
            </div>
          </Popup>
        )}
      </ReactMap>

      {/* Legend */}
      <motion.div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-xl px-4 py-3 z-10 shadow-lg"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <p className="text-[11px] font-semibold text-foreground font-display mb-2">Score de Rentabilidade</p>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-xs text-foreground/80 font-body">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <span className="font-medium">Alto</span>
            <span className="text-muted-foreground">(score ≥ 88)</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-foreground/80 font-body">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
            <span className="font-medium">Médio</span>
            <span className="text-muted-foreground">(score 84–87)</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-foreground/80 font-body">
            <span className="w-3 h-3 rounded-full bg-gray-400 ring-2 ring-gray-400/20" />
            <span className="font-medium">Baixo</span>
            <span className="text-muted-foreground">(score &lt; 84)</span>
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2 font-body">Clique nos pontos para ver detalhes</p>
        {showPOIs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[11px] font-semibold text-foreground font-display mb-1.5">Pontos de Interesse</p>
            <div className="flex flex-col gap-1">
              {POI_CATEGORIES.filter((c) => showPOIs.includes(c.key)).map((c) => (
                <span key={c.key} className="flex items-center gap-2 text-xs font-body">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color, boxShadow: `0 0 0 2px ${c.color}33` }} />
                  <span className="text-foreground/80">{c.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Events Timeline ─── */
function EventsTimeline({ events, onEventClick, activeEventId }: { events: CityEvent[]; onEventClick: (e: CityEvent) => void; activeEventId: number | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.category as keyof typeof EVENT_ICONS] || Calendar;
        const style = IMPACT_STYLES[event.impactLevel] || IMPACT_STYLES.low;
        const isActive = activeEventId === event.id;
        return (
          <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Card onClick={() => onEventClick(event)}
              className={`cursor-pointer transition-all duration-200 ${isActive ? "ring-2 ring-primary border-primary shadow-md" : "border-border hover:shadow-md hover:border-primary/30"}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg ${style.bg}`}><Icon size={14} className={style.text} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-xs font-bold font-display text-foreground truncate">{event.name}</h4>
                      <Badge className={`text-[9px] px-1 py-0 ${style.bg} ${style.text} border-0`}>{style.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body">{event.startDate} — {event.endDate}</p>
                    <p className="text-[10px] text-muted-foreground font-body mt-0.5 line-clamp-2">{event.location}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {event.nearbyNeighborhoods.slice(0, 3).map((name) => (
                        <span key={name} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{name}</span>
                      ))}
                      {event.nearbyNeighborhoods.length > 3 && <span className="text-[9px] text-muted-foreground">+{event.nearbyNeighborhoods.length - 3}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─── */
export default function MapaBairrosEmbed() {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showMetro, setShowMetro] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(false);
  const [activePOIs, setActivePOIs] = useState<POICategoryKey[]>([]);
  const [activeEvent, setActiveEvent] = useState<CityEvent | null>(null);
  const [search, setSearch] = useState("");
  const [showComparison, setShowComparison] = useState(false);

  const togglePOI = useCallback((key: POICategoryKey) => {
    setActivePOIs((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }, []);

  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId]);
  }, []);

  const handleEventClick = useCallback((event: CityEvent) => {
    setActiveEvent((prev) => prev?.id === event.id ? null : event);
  }, []);

  const handleRankingSelect = useCallback((n: Neighborhood) => {
    setSelectedNeighborhood(n);
  }, []);

  const highlightedNames = useMemo(() => activeEvent?.nearbyNeighborhoods || [], [activeEvent]);

  const filtered = useMemo(() => {
    let list = NEIGHBORHOODS;
    if (search) list = list.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilters.length > 0) {
      list = list.filter((n) => activeFilters.some((f) => n.tags.map((t) => t.toLowerCase()).includes(f.toLowerCase())));
    }
    return list;
  }, [search, activeFilters]);

  const [showSimulator, setShowSimulator] = useState(false);

  return (
    <div className="space-y-6">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar bairro..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-body" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)} className="font-body text-xs">
              <ArrowUpDown size={14} className="mr-1.5" />Comparar
            </Button>
          </div>
        </div>

        {/* Demand filters */}
        <div className="flex flex-wrap gap-2">
          {DEMAND_FILTERS.map((f) => {
            const active = activeFilters.includes(f.key);
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => toggleFilter(f.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}>
                <Icon size={12} />{f.label}
              </button>
            );
          })}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
              <Flame size={12} /><span>Heatmap</span>
              <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} className="scale-75" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
              <CircleDot size={12} /><span>Clusters</span>
              <Switch checked={showClusters} onCheckedChange={setShowClusters} className="scale-75" />
            </div>
          </div>
        </div>

        {/* POI filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Layers size={12} /> Pontos de interesse:
          </span>
          {POI_CATEGORIES.map((cat) => {
            const active = activePOIs.includes(cat.key);
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => togglePOI(cat.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0 ${
                  active
                    ? "border-primary/50 shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
                style={active ? { backgroundColor: `${cat.color}18`, color: cat.color, borderColor: `${cat.color}60` } : undefined}
              >
                <Icon size={12} />{cat.label}
              </button>
            );
          })}
          {activePOIs.length > 0 && (
            <button onClick={() => setActivePOIs([])} className="text-xs text-muted-foreground hover:text-foreground underline ml-1 flex-shrink-0">
              Limpar POIs
            </button>
          )}
        </div>

        {/* POI legend when active */}
        {activePOIs.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-muted-foreground font-body">
            📍 Mostrando {activePOIs.length} categoria{activePOIs.length > 1 ? "s" : ""} de pontos de interesse no mapa. Zoom in para ver nomes.
          </div>
        )}

        {/* Filter explainer */}
        {activeFilters.length > 0 && (
          <p className="text-[10px] text-muted-foreground font-body mt-1 ml-1">
            🔍 Filtrando por perfil de demanda — mostrando apenas bairros com esse tipo de público predominante.
          </p>
        )}
      </div>

      {/* Comparison panel */}
      <AnimatePresence>
        {showComparison && (
          <div className="mb-8">
            <NeighborhoodComparison onClose={() => setShowComparison(false)} initialNeighborhoods={NEIGHBORHOODS.slice(0, 2)} />
          </div>
        )}
      </AnimatePresence>

      {/* Map + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
        <div className="lg:col-span-2 order-1">
          <InteractiveMap
            neighborhoods={filtered}
            stations={METRO_STATIONS}
            showMetro={showMetro}
            showHeatmap={showHeatmap}
            showClusters={showClusters}
            showPOIs={activePOIs}
            selected={selectedNeighborhood}
            highlightedNames={highlightedNames}
            onSelect={(n) => { setSelectedNeighborhood(n); }}
          />
        </div>

        <div className="lg:col-span-1 order-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Ranking de Bairros</h3>
          </div>
          <ROIRanking neighborhoods={filtered} onSelectNeighborhood={handleRankingSelect} selectedName={selectedNeighborhood?.name} />
        </div>
      </div>

      {/* Neighborhood Grid */}
      <div className="mb-12">
        <h3 className="font-display text-xl font-bold text-foreground mb-1">Bairros analisados</h3>
        <p className="text-sm text-muted-foreground font-body mb-3">{filtered.length} bairro{filtered.length !== 1 ? "s" : ""}</p>
        {/* Card legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground font-body">
          <span className="font-semibold text-foreground text-xs">Como ler os cards:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Score ≥ 88 (alto potencial)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Score 84–87 (moderado)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Score &lt; 84 (menor potencial)
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <span className="hidden sm:inline">Tags indicam perfil de demanda e amenidades da região</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((n, i) => (
              <NeighborhoodCard key={n.name} n={n} index={i} isSelected={selectedNeighborhood?.name === n.name}
                isHighlighted={highlightedNames.includes(n.name)}
                onClick={() => { setSelectedNeighborhood(n); }} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Events */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={20} className="text-primary" />
          <h3 className="font-display text-xl font-bold text-foreground">Eventos que aumentam a demanda</h3>
        </div>
        <p className="text-sm text-muted-foreground font-body mb-3">Clique em um evento para destacar os bairros impactados no mapa.</p>
        {/* Events impact legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] font-body">
          <span className="text-muted-foreground font-semibold">Nível de impacto:</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">🔴 Alta demanda — picos de até +40% nas reservas</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">🟡 Média demanda — aumento moderado</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">⚪ Baixa demanda — impacto localizado</span>
        </div>
        <EventsTimeline events={EVENTS} onEventClick={handleEventClick} activeEventId={activeEvent?.id ?? null} />
      </div>
    </div>
  );
}
