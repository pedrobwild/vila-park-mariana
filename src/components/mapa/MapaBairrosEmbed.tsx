/**
 * Entorno · Vila Mariana
 * Mapa focado no empreendimento Vila Park (R. Baltazar Lisboa, 543 — Vila Mariana)
 * e nos pontos de interesse do quarteirão.
 */
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Layers } from "lucide-react";
import ReactMap, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  VILA_PARK_COORDS, VILA_PARK_ADDRESS, VILA_PARK_POIS, POI_CATEGORY_META,
  type VilaParkPoi, type PoiCategory,
} from "@/components/mapa/SaoPauloMap";
import NeighborhoodComparison from "@/components/mapa/NeighborhoodComparison";
import { useBasemapStyle } from "@/lib/basemap";
import { logBasemap, registerBasemapMap, unregisterBasemapMap } from "@/lib/basemapLog";

const CATEGORY_ORDER: PoiCategory[] = ["leisure", "mobility", "education", "services", "gastronomy"];

export default function MapaBairrosEmbed() {
  const [activeCategories, setActiveCategories] = useState<PoiCategory[]>(CATEGORY_ORDER);
  const [activePoi, setActivePoi] = useState<VilaParkPoi | null>(null);
  const [showEmpreendimento, setShowEmpreendimento] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const { style: mapStyle, onError: onMapError } = useBasemapStyle("MapaBairrosEmbed");
  const mapRef = useRef<any>(null);

  const toggleCategory = (cat: PoiCategory) => {
    setActiveCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const visiblePois = VILA_PARK_POIS.filter((p) => activeCategories.includes(p.category));

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Entorno · Vila Mariana</h2>
        <p className="text-sm text-muted-foreground font-body">{VILA_PARK_ADDRESS}</p>
      </motion.div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((cat) => {
          const meta = POI_CATEGORY_META[cat];
          const Icon = meta.icon;
          const active = activeCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active ? "text-white border-transparent" : "bg-secondary text-secondary-foreground border-border"
              }`}
              style={active ? { backgroundColor: meta.color } : undefined}
            >
              <Icon size={12} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <motion.div
        className="relative w-full aspect-square md:aspect-[16/9] rounded-xl border border-border overflow-hidden min-h-[320px]"
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <ReactMap
          ref={mapRef}
          initialViewState={{ longitude: VILA_PARK_COORDS.lng, latitude: VILA_PARK_COORDS.lat, zoom: 15 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          minZoom={12}
          maxZoom={18}
          onError={onMapError}
          onLoad={(event) => {
            event.target.resize();
            logBasemap({ event: "map_load", component: "MapaBairrosEmbed", style: mapStyle });
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />

          <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="bottom">
            <button onClick={() => setShowEmpreendimento(true)} aria-label="Vila Park">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin size={16} />
              </div>
            </button>
          </Marker>
          {showEmpreendimento && (
            <Popup
              longitude={VILA_PARK_COORDS.lng}
              latitude={VILA_PARK_COORDS.lat}
              anchor="top"
              onClose={() => setShowEmpreendimento(false)}
              closeButton
            >
              <div className="text-xs">
                <p className="font-bold">Vila Park</p>
                <p className="text-muted-foreground">{VILA_PARK_ADDRESS}</p>
              </div>
            </Popup>
          )}

          {visiblePois.map((poi) => {
            const meta = POI_CATEGORY_META[poi.category];
            const Icon = meta.icon;
            return (
              <Marker key={poi.name} longitude={poi.lng} latitude={poi.lat} anchor="bottom">
                <button
                  onClick={() => setActivePoi(poi)}
                  className="flex items-center justify-center w-6 h-6 rounded-full shadow border border-white"
                  style={{ backgroundColor: meta.color }}
                  aria-label={poi.name}
                >
                  <Icon size={12} className="text-white" />
                </button>
              </Marker>
            );
          })}

          {activePoi && (
            <Popup
              longitude={activePoi.lng}
              latitude={activePoi.lat}
              anchor="top"
              onClose={() => setActivePoi(null)}
              closeButton
            >
              <div className="text-xs">
                <p className="font-bold">{activePoi.name}</p>
                <p className="text-muted-foreground">{POI_CATEGORY_META[activePoi.category].label} · {activePoi.distance}</p>
              </div>
            </Popup>
          )}
        </ReactMap>
      </motion.div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNearby((v) => !v)}>
          <Layers size={14} />
          {showNearby ? "Ocultar lista" : "O que tem no quarteirão do Vila Park"}
        </Button>
      </div>

      <AnimatePresence>
        {showNearby && <NeighborhoodComparison onClose={() => setShowNearby(false)} />}
      </AnimatePresence>
    </section>
  );
}
