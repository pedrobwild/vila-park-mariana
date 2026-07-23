import { useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Trees, Train, GraduationCap, ShoppingBag, UtensilsCrossed, Building2 } from "lucide-react";
import {
  POIS,
  VILA_PARK_COORDS,
  VILA_PARK_ADDRESS,
  type Poi,
  type PoiCategory,
} from "@/data/surroundings";
import { useBasemapStyle } from "@/lib/basemap";
import { logBasemap } from "@/lib/basemapLog";

// Re-exports para consumidores legados (não duplicar dados).
export { VILA_PARK_COORDS, VILA_PARK_ADDRESS, POIS as VILA_PARK_POIS };
export type { Poi as VilaParkPoi, PoiCategory };

export const POI_CATEGORY_META: Record<PoiCategory, { label: string; icon: typeof Trees; color: string }> = {
  leisure: { label: "Lazer", icon: Trees, color: "#16a34a" },
  mobility: { label: "Mobilidade", icon: Train, color: "#2563eb" },
  education: { label: "Educação", icon: GraduationCap, color: "#9333ea" },
  services: { label: "Serviços", icon: ShoppingBag, color: "#ea580c" },
  gastronomy: { label: "Gastronomia", icon: UtensilsCrossed, color: "#dc2626" },
};

export default function SaoPauloMap() {
  const [active, setActive] = useState<Poi | null>(null);
  const [showVilaPark, setShowVilaPark] = useState(false);
  const { style: mapStyle, onError: onMapError } = useBasemapStyle("SaoPauloMap");
  const mapRef = useRef<any>(null);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: VILA_PARK_COORDS.lng, latitude: VILA_PARK_COORDS.lat, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onError={onMapError}
        onLoad={(event) => {
          event.target.resize();
          logBasemap({ event: "map_load", component: "SaoPauloMap", style: mapStyle });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="bottom">
          <button onClick={() => setShowVilaPark(true)} className="flex flex-col items-center" aria-label="Vila Park">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white">
              <Building2 size={16} />
            </div>
          </button>
        </Marker>
        {showVilaPark && (
          <Popup longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="top" onClose={() => setShowVilaPark(false)} closeButton>
            <div className="text-xs">
              <p className="font-bold">Vila Park</p>
              <p className="text-muted-foreground">{VILA_PARK_ADDRESS}</p>
            </div>
          </Popup>
        )}

        {POIS.map((poi) => {
          const meta = POI_CATEGORY_META[poi.category];
          const Icon = meta.icon;
          return (
            <Marker key={poi.name} longitude={poi.lng} latitude={poi.lat} anchor="bottom">
              <button
                onClick={() => setActive(poi)}
                className="flex items-center justify-center w-6 h-6 rounded-full shadow border border-white"
                style={{ backgroundColor: meta.color }}
                aria-label={poi.name}
              >
                <Icon size={12} className="text-white" />
              </button>
            </Marker>
          );
        })}

        {active && (
          <Popup longitude={active.lng} latitude={active.lat} anchor="top" onClose={() => setActive(null)} closeButton>
            <div className="text-xs">
              <p className="font-bold">{active.name}</p>
              <p className="text-muted-foreground">{POI_CATEGORY_META[active.category].label} · {active.distance}</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
