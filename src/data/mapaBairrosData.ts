import {
  MapPin, Train, Calendar, Briefcase, Stethoscope, Zap, Music, Trophy, Theater, Ticket,
  Utensils, Wifi, Palette, ShoppingBag, Star, Building2, Plane, Trees, GraduationCap, Heart,
  Camera, Landmark,
} from "lucide-react";

/* ─── POI Categories ─── */
export const POI_CATEGORIES = [
  { key: "restaurant", label: "Restaurantes", icon: Utensils, color: "#f97316" },
  { key: "corporate", label: "Corporativo", icon: Briefcase, color: "#3b82f6" },
  { key: "tourist", label: "Pontos turísticos", icon: Camera, color: "#a855f7" },
  { key: "events", label: "Eventos / Shows", icon: Music, color: "#ef4444" },
  { key: "metro", label: "Metrô", icon: Train, color: "#10b981" },
] as const;

export type POICategoryKey = typeof POI_CATEGORIES[number]["key"];

export const POI_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  corporate: "#3b82f6",
  tourist: "#a855f7",
  events: "#ef4444",
  metro: "#10b981",
};
import { DISTRICTS_MOCK, type DistrictRow } from "@/data/districtMetrics";

/* ─── Types ─── */
export interface NeighborhoodMetrics {
  nightlyRate: number;
  nightlyRateRange: [number, number];
  occupancy: number;
  estimatedROI: number;
  competitionLevel: "alta" | "média" | "baixa";
  activeListings: number;
  avgRevenueMo: number;
  priceSqm: number;
  seasonalityIndex: number;
  dataSource: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  tags: string[];
  demandProfile: string;
  score: number;
  avgNightly: number;
  avgOccupancy: number;
  coordinates: { x: number; y: number };
  centerLat: number;
  centerLng: number;
  metrics: NeighborhoodMetrics;
}

export interface MetroStation {
  id: number;
  name: string;
  line: string;
  color: string;
  coordinates: { x: number; y: number };
}

export interface CityEvent {
  id: number;
  name: string;
  category: string;
  location: string;
  startDate: string;
  endDate: string;
  impactLevel: "high" | "medium" | "low";
  nearbyNeighborhoods: string[];
}

export interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  demandScore: number;
  occupancyEstimate: number;
  adrEstimate: number;
  areaName: string;
  coordinates: { x: number; y: number };
}

/* ─── District → Neighborhood adapter ─── */

const DISTRICT_CENTERS: Record<string, { lat: number; lng: number; x: number; y: number }> = {
  "Pinheiros":       { lat: -23.5613, lng: -46.6917, x: 28, y: 38 },
  "Itaim Bibi":      { lat: -23.5863, lng: -46.6762, x: 38, y: 55 },
  "Jardim Paulista":  { lat: -23.5636, lng: -46.6682, x: 42, y: 40 },
  "Consolação":      { lat: -23.5530, lng: -46.6562, x: 48, y: 35 },
  "Bela Vista":      { lat: -23.5580, lng: -46.6442, x: 52, y: 42 },
  "Moema":           { lat: -23.6013, lng: -46.6662, x: 48, y: 68 },
  "Vila Mariana":    { lat: -23.5890, lng: -46.6350, x: 55, y: 60 },
  "Barra Funda":     { lat: -23.5265, lng: -46.6810, x: 32, y: 18 },
  "Campo Belo":      { lat: -23.6200, lng: -46.6650, x: 46, y: 72 },
  "República":       { lat: -23.5430, lng: -46.6430, x: 54, y: 30 },
  "Santana":         { lat: -23.5050, lng: -46.6280, x: 56, y: 10 },
  "Itaquera":        { lat: -23.5400, lng: -46.4550, x: 85, y: 25 },
};

const COMPETITION_MAP: Record<string, "alta" | "média" | "baixa"> = {
  "Alta": "alta",
  "Média": "média",
  "Baixa": "baixa",
};

const CHIP_TO_DEMAND: Record<string, string> = {
  "Misto": "mixed",
  "Corporativo": "business",
  "Turismo": "tourism",
  "Turismo Premium": "premium tourism",
  "Eventos": "events",
  "Hospitais": "medical",
  "Universidades": "medical",
  "Próximo ao metrô": "metro",
};

function parseAdrRange(label: string): [number, number] {
  const nums = label.match(/[\d.]+/g);
  if (nums && nums.length >= 2) return [Number(nums[0]), Number(nums[1])];
  return [0, 0];
}

function districtToNeighborhood(d: DistrictRow): Neighborhood {
  const center = DISTRICT_CENTERS[d.districtName] || { lat: -23.55, lng: -46.64, x: 50, y: 50 };
  const demandChip = d.chips.find((c) => c !== "Próximo ao metrô") || "Misto";
  const demandProfile = CHIP_TO_DEMAND[demandChip] || "mixed";

  return {
    id: d.districtName.toLowerCase().replace(/\s+/g, "-"),
    name: d.districtName,
    tags: d.chips.map((c) => c.toLowerCase()),
    demandProfile,
    score: d.score,
    avgNightly: d.nightlyRateBRL,
    avgOccupancy: d.occupancyPercent,
    coordinates: { x: center.x, y: center.y },
    centerLat: center.lat,
    centerLng: center.lng,
    metrics: {
      nightlyRate: d.nightlyRateBRL,
      nightlyRateRange: parseAdrRange(d.adrRangeLabel),
      occupancy: d.occupancyPercent,
      estimatedROI: d.roiPercent,
      competitionLevel: COMPETITION_MAP[d.competition] || "média",
      activeListings: d.listingsCount,
      avgRevenueMo: d.revenueMonthBRL,
      priceSqm: d.priceSqm,
      seasonalityIndex: 1.0,
      dataSource: d.sourceLabel,
    },
  };
}

/* ─── Derived Seed Data ─── */
export const NEIGHBORHOODS: Neighborhood[] = DISTRICTS_MOCK.map(districtToNeighborhood);

export const METRO_STATIONS: MetroStation[] = [
  { id: 1, name: "Faria Lima", line: "Linha 4 - Amarela", color: "#FFD700", coordinates: { x: 32, y: 48 } },
  { id: 2, name: "Pinheiros", line: "Linha 4 - Amarela", color: "#FFD700", coordinates: { x: 26, y: 40 } },
  { id: 3, name: "Consolação", line: "Linha 2 - Verde", color: "#00A651", coordinates: { x: 46, y: 36 } },
  { id: 4, name: "Trianon-Masp", line: "Linha 2 - Verde", color: "#00A651", coordinates: { x: 44, y: 38 } },
  { id: 5, name: "Brigadeiro", line: "Linha 2 - Verde", color: "#00A651", coordinates: { x: 48, y: 42 } },
  { id: 6, name: "Vila Madalena", line: "Linha 2 - Verde", color: "#00A651", coordinates: { x: 20, y: 30 } },
  { id: 7, name: "Fradique Coutinho", line: "Linha 4 - Amarela", color: "#FFD700", coordinates: { x: 24, y: 36 } },
  { id: 8, name: "Oscar Freire", line: "Linha 4 - Amarela", color: "#FFD700", coordinates: { x: 38, y: 38 } },
  { id: 9, name: "Moema", line: "Linha 5 - Lilás", color: "#9B59B6", coordinates: { x: 46, y: 66 } },
  { id: 10, name: "Eucaliptos", line: "Linha 5 - Lilás", color: "#9B59B6", coordinates: { x: 50, y: 70 } },
  { id: 11, name: "Palmeiras-Barra Funda", line: "Linha 3 - Vermelha", color: "#EE3124", coordinates: { x: 30, y: 16 } },
  { id: 12, name: "Brooklin", line: "Linha 5 - Lilás", color: "#9B59B6", coordinates: { x: 40, y: 62 } },
];

export const EVENTS: CityEvent[] = [
  { id: 1, name: "São Paulo Fashion Week", category: "Culture", location: "Bienal do Ibirapuera", startDate: "2026-04-14", endDate: "2026-04-19", impactLevel: "high", nearbyNeighborhoods: ["Moema", "Vila Mariana", "Jardim Paulista"] },
  { id: 2, name: "Web Summit Rio → SP Side Events", category: "Business", location: "Vários locais", startDate: "2026-05-05", endDate: "2026-05-08", impactLevel: "high", nearbyNeighborhoods: ["Pinheiros", "Itaim Bibi", "Campo Belo"] },
  { id: 3, name: "Lollapalooza Brasil", category: "Music", location: "Autódromo de Interlagos", startDate: "2026-03-27", endDate: "2026-03-29", impactLevel: "high", nearbyNeighborhoods: ["Moema", "Campo Belo", "Itaim Bibi"] },
  { id: 4, name: "APAS Show", category: "Expo", location: "Expo Center Norte", startDate: "2026-05-11", endDate: "2026-05-14", impactLevel: "medium", nearbyNeighborhoods: ["Barra Funda", "Santana"] },
  { id: 5, name: "Festival de Teatro de São Paulo", category: "Culture", location: "Vários teatros", startDate: "2026-08-10", endDate: "2026-08-24", impactLevel: "medium", nearbyNeighborhoods: ["Bela Vista", "Consolação", "República"] },
  { id: 6, name: "HOSPITALAR", category: "Expo", location: "São Paulo Expo", startDate: "2026-05-19", endDate: "2026-05-22", impactLevel: "medium", nearbyNeighborhoods: ["Vila Mariana", "Moema"] },
  { id: 7, name: "GP Brasil de F1", category: "Sports", location: "Autódromo de Interlagos", startDate: "2026-11-06", endDate: "2026-11-08", impactLevel: "high", nearbyNeighborhoods: ["Moema", "Campo Belo", "Itaim Bibi"] },
  { id: 8, name: "Virada Cultural", category: "Culture", location: "Centro Histórico", startDate: "2026-06-20", endDate: "2026-06-21", impactLevel: "medium", nearbyNeighborhoods: ["Bela Vista", "Consolação", "República"] },
  { id: 9, name: "Fecomercio SP", category: "Business", location: "FIESP", startDate: "2026-09-15", endDate: "2026-09-18", impactLevel: "low", nearbyNeighborhoods: ["Consolação", "Jardim Paulista", "Itaim Bibi"] },
  { id: 10, name: "Comic Con Experience (CCXP)", category: "Culture", location: "São Paulo Expo", startDate: "2026-12-03", endDate: "2026-12-06", impactLevel: "high", nearbyNeighborhoods: ["Vila Mariana", "Moema", "Campo Belo"] },
];

export const HEAT_POINTS: HeatPoint[] = [
  { id: "hp1", lat: -23.56, lng: -46.69, demandScore: 95, occupancyEstimate: 75, adrEstimate: 410, areaName: "Pinheiros Centro", coordinates: { x: 28, y: 38 } },
  { id: "hp2", lat: -23.55, lng: -46.66, demandScore: 86, occupancyEstimate: 74, adrEstimate: 390, areaName: "Consolação", coordinates: { x: 48, y: 35 } },
  { id: "hp3", lat: -23.56, lng: -46.67, demandScore: 90, occupancyEstimate: 70, adrEstimate: 440, areaName: "Jardim Paulista", coordinates: { x: 42, y: 40 } },
  { id: "hp4", lat: -23.59, lng: -46.68, demandScore: 92, occupancyEstimate: 73, adrEstimate: 440, areaName: "Itaim Bibi", coordinates: { x: 38, y: 55 } },
  { id: "hp5", lat: -23.56, lng: -46.64, demandScore: 82, occupancyEstimate: 72, adrEstimate: 360, areaName: "Bela Vista", coordinates: { x: 52, y: 42 } },
  { id: "hp6", lat: -23.60, lng: -46.67, demandScore: 85, occupancyEstimate: 70, adrEstimate: 380, areaName: "Moema", coordinates: { x: 48, y: 68 } },
  { id: "hp7", lat: -23.59, lng: -46.64, demandScore: 83, occupancyEstimate: 71, adrEstimate: 350, areaName: "Vila Mariana", coordinates: { x: 55, y: 60 } },
  { id: "hp8", lat: -23.53, lng: -46.68, demandScore: 80, occupancyEstimate: 68, adrEstimate: 340, areaName: "Barra Funda", coordinates: { x: 32, y: 18 } },
  { id: "hp9", lat: -23.62, lng: -46.67, demandScore: 84, occupancyEstimate: 69, adrEstimate: 370, areaName: "Campo Belo", coordinates: { x: 46, y: 72 } },
  { id: "hp10", lat: -23.54, lng: -46.64, demandScore: 79, occupancyEstimate: 67, adrEstimate: 300, areaName: "República", coordinates: { x: 54, y: 30 } },
  { id: "hp11", lat: -23.51, lng: -46.63, demandScore: 81, occupancyEstimate: 66, adrEstimate: 310, areaName: "Santana", coordinates: { x: 56, y: 10 } },
  { id: "hp12", lat: -23.54, lng: -46.46, demandScore: 78, occupancyEstimate: 62, adrEstimate: 260, areaName: "Itaquera", coordinates: { x: 85, y: 25 } },
  { id: "hp13", lat: -23.57, lng: -46.70, demandScore: 70, occupancyEstimate: 67, adrEstimate: 360, areaName: "Alto de Pinheiros", coordinates: { x: 18, y: 42 } },
  { id: "hp14", lat: -23.55, lng: -46.66, demandScore: 65, occupancyEstimate: 66, adrEstimate: 290, areaName: "Higienópolis", coordinates: { x: 50, y: 28 } },
  { id: "hp15", lat: -23.58, lng: -46.66, demandScore: 82, occupancyEstimate: 71, adrEstimate: 390, areaName: "Paraíso", coordinates: { x: 52, y: 50 } },
];

export const DEMAND_FILTERS = [
  { key: "tourism", label: "Turismo", icon: MapPin },
  { key: "business", label: "Corporativo", icon: Briefcase },
  { key: "events", label: "Eventos", icon: Calendar },
  { key: "medical", label: "Hospitais", icon: Stethoscope },
  { key: "mixed", label: "Misto", icon: Zap },
  { key: "metro", label: "Próximo ao metrô", icon: Train },
];

export const EVENT_ICONS: Record<string, typeof Music> = {
  Music, Sports: Trophy, Culture: Theater, Business: Briefcase, Expo: Ticket,
};

export const IMPACT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-destructive/10", text: "text-destructive", label: "Alta demanda" },
  medium: { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", label: "Média demanda" },
  low: { bg: "bg-muted", text: "text-muted-foreground", label: "Baixa demanda" },
};

export const TAG_ICONS: Record<string, typeof MapPin> = {
  misto: Zap, corporativo: Briefcase, turismo: MapPin, "turismo premium": Star,
  eventos: Calendar, hospitais: Stethoscope, universidades: GraduationCap,
  "próximo ao metrô": Train, gastronomia: Utensils, "vida noturna": Music,
  coworking: Wifi, arte: Palette, bares: Music, luxo: Star, compras: ShoppingBag,
  restaurantes: Utensils, negocios: Briefcase, tech: Zap, cultura: Theater,
  museus: Theater, teatro: Theater, residencial: Building2, aeroporto: Plane,
  parque: Trees, saude: Heart, expo: Ticket, transporte: Train,
  "business district": Building2,
};

export const INVESTOR_INSIGHTS = [
  { icon: Train, text: "Studios próximos ao metrô tendem a ter +10% ocupação média." },
  { icon: Utensils, text: "Áreas com alta densidade de restaurantes aumentam diária média em até 15%." },
  { icon: Briefcase, text: "Eventos corporativos aumentam demanda em bairros business em até 25%." },
  { icon: Music, text: "Festivais de música geram picos de até 40% na demanda local." },
  { icon: Building2, text: "Bairros com score acima de 88 têm payback médio abaixo de 3 anos." },
];

export const DEMAND_PROFILE_LABELS: Record<string, { label: string; emoji: string }> = {
  "mixed": { label: "Misto", emoji: "⚡" },
  "tourism": { label: "Turismo", emoji: "🎭" },
  "premium tourism": { label: "Turismo Premium", emoji: "✨" },
  "business": { label: "Corporativo", emoji: "💼" },
  "medical": { label: "Hospitalar", emoji: "🏥" },
  "events": { label: "Eventos", emoji: "🎪" },
};

export const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export function scoreColor(score: number) {
  if (score >= 88) return "bg-emerald-500";
  if (score >= 84) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

export function scoreBorder(score: number) {
  if (score >= 88) return "border-emerald-500/40";
  if (score >= 84) return "border-amber-500/40";
  return "border-border";
}
