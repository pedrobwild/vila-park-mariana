import { useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Trees, Train, GraduationCap, ShoppingBag, UtensilsCrossed, Building2 } from "lucide-react";

const MAP_STYLE = "https://api.maptiler.com/maps/019cc06d-fb8e-741d-b158-a17a30e87c08/style.json?key=AI17dHeoeJx6rUC1KlSL";

/* ─── Vila Park — endereço e centro do mapa ─── */
export const VILA_PARK_COORDS = { lat: -23.585, lng: -46.641 };
export const VILA_PARK_ADDRESS = "R. Baltazar Lisboa, 543 — Vila Mariana, SP";

export type PoiCategory = "lazer" | "mobilidade" | "educacao" | "servicos" | "gastronomia";

export interface VilaParkPoi {
  name: string;
  category: PoiCategory;
  distance: string;
  lat: number;
  lng: number;
}

export const POI_CATEGORY_META: Record<PoiCategory, { label: string; icon: typeof Trees; color: string }> = {
  lazer: { label: "Lazer", icon: Trees, color: "#16a34a" },
  mobilidade: { label: "Mobilidade", icon: Train, color: "#2563eb" },
  educacao: { label: "Educação", icon: GraduationCap, color: "#9333ea" },
  servicos: { label: "Serviços", icon: ShoppingBag, color: "#ea580c" },
  gastronomia: { label: "Gastronomia", icon: UtensilsCrossed, color: "#dc2626" },
};

/* Coordenadas aproximadas ao redor do Vila Park, distribuídas por distância/direção */
export const VILA_PARK_POIS: VilaParkPoi[] = [
  // Lazer
  { name: "Parque da Aclimação", category: "lazer", distance: "950m", lat: -23.5788, lng: -46.6355 },
  { name: "Museu da Matemática", category: "lazer", distance: "1km", lat: -23.5895, lng: -46.6335 },
  { name: "Comedy Sampa Club", category: "lazer", distance: "1,4km", lat: -23.5765, lng: -46.6465 },
  { name: "SESC", category: "lazer", distance: "2,2km", lat: -23.5980, lng: -46.6360 },
  { name: "Av. Paulista", category: "lazer", distance: "2,5km", lat: -23.5670, lng: -46.6520 },
  { name: "Parque Ibirapuera", category: "lazer", distance: "3,1km", lat: -23.5875, lng: -46.6580 },
  { name: "MASP", category: "lazer", distance: "4,2km", lat: -23.5613, lng: -46.6564 },
  // Mobilidade
  { name: "Metrô Vila Mariana", category: "mobilidade", distance: "900m", lat: -23.5895, lng: -46.6345 },
  { name: "Metrô Ana Rosa", category: "mobilidade", distance: "1,1km", lat: -23.5810, lng: -46.6355 },
  // Educação
  { name: "FMU", category: "educacao", distance: "850m", lat: -23.5805, lng: -46.6470 },
  { name: "Univ. Belas Artes", category: "educacao", distance: "1,5km", lat: -23.5945, lng: -46.6435 },
  { name: "ESPM", category: "educacao", distance: "1,5km", lat: -23.5735, lng: -46.6320 },
  // Serviços
  { name: "Drogasil", category: "servicos", distance: "500m", lat: -23.5830, lng: -46.6395 },
  { name: "Smart Fit", category: "servicos", distance: "950m", lat: -23.5900, lng: -46.6420 },
  { name: "Vila das Frutas", category: "servicos", distance: "1km", lat: -23.5820, lng: -46.6500 },
  { name: "Kalunga", category: "servicos", distance: "1km", lat: -23.5905, lng: -46.6465 },
  { name: "Leroy Merlin", category: "servicos", distance: "1,9km", lat: -23.5960, lng: -46.6300 },
  { name: "Shopping Santa Cruz", category: "servicos", distance: "2,2km", lat: -23.5940, lng: -46.6330 },
  { name: "Shopping Paulista", category: "servicos", distance: "2,5km", lat: -23.5695, lng: -46.6495 },
  // Gastronomia
  { name: "Veloso Bar", category: "gastronomia", distance: "700m", lat: -23.5885, lng: -46.6390 },
  { name: "Quintal do Espeto", category: "gastronomia", distance: "1,8km", lat: -23.5935, lng: -46.6280 },
  { name: "Bráz Quintal", category: "gastronomia", distance: "2,4km", lat: -23.5980, lng: -46.6260 },
];

export default function SaoPauloMap() {
  const [active, setActive] = useState<VilaParkPoi | null>(null);
  const [showVilaPark, setShowVilaPark] = useState(false);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <Map
        initialViewState={{
          longitude: VILA_PARK_COORDS.lng,
          latitude: VILA_PARK_COORDS.lat,
          zoom: 15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Marcador principal — Vila Park */}
        <Marker longitude={VILA_PARK_COORDS.lng} latitude={VILA_PARK_COORDS.lat} anchor="bottom">
          <button
            onClick={() => setShowVilaPark(true)}
            className="flex flex-col items-center"
            aria-label="Vila Park"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white">
              <Building2 size={16} />
            </div>
          </button>
        </Marker>
        {showVilaPark && (
          <Popup
            longitude={VILA_PARK_COORDS.lng}
            latitude={VILA_PARK_COORDS.lat}
            anchor="top"
            onClose={() => setShowVilaPark(false)}
            closeButton
          >
            <div className="text-xs">
              <p className="font-bold">Vila Park</p>
              <p className="text-muted-foreground">{VILA_PARK_ADDRESS}</p>
            </div>
          </Popup>
        )}

        {/* POIs do entorno */}
        {VILA_PARK_POIS.map((poi) => {
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
          <Popup
            longitude={active.lng}
            latitude={active.lat}
            anchor="top"
            onClose={() => setActive(null)}
            closeButton
          >
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
