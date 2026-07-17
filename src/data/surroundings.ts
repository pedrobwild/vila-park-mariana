// POIs no entorno do Vila Park — Vila Mariana (R. Baltazar Lisboa, 543).
// Distâncias conforme material oficial do empreendimento.

export type PoiCategory = "leisure" | "mobility" | "education" | "services" | "gastronomy";

export interface Poi {
  name: string;
  distance: string;
  category: PoiCategory;
}

export const POIS: Poi[] = [
  // Lazer
  { name: "Parque da Aclimação", distance: "950 m", category: "leisure" },
  { name: "Museu da Matemática", distance: "1 km", category: "leisure" },
  { name: "Comedy Sampa Club", distance: "1,4 km", category: "leisure" },
  { name: "SESC", distance: "2,2 km", category: "leisure" },
  { name: "Av. Paulista", distance: "2,5 km", category: "leisure" },
  { name: "Parque Ibirapuera", distance: "3,1 km", category: "leisure" },
  { name: "MASP", distance: "4,2 km", category: "leisure" },
  // Mobilidade
  { name: "Metrô Vila Mariana", distance: "900 m", category: "mobility" },
  { name: "Metrô Ana Rosa", distance: "1,1 km", category: "mobility" },
  // Educação
  { name: "FMU", distance: "850 m", category: "education" },
  { name: "Univ. Belas Artes", distance: "1,5 km", category: "education" },
  { name: "ESPM", distance: "1,5 km", category: "education" },
  // Serviços
  { name: "Drogasil", distance: "500 m", category: "services" },
  { name: "Smart Fit", distance: "950 m", category: "services" },
  { name: "Vila das Frutas", distance: "1 km", category: "services" },
  { name: "Kalunga", distance: "1 km", category: "services" },
  { name: "Leroy Merlin", distance: "1,9 km", category: "services" },
  { name: "Shopping Santa Cruz", distance: "2,2 km", category: "services" },
  { name: "Shopping Paulista", distance: "2,5 km", category: "services" },
  // Gastronomia
  { name: "Veloso Bar", distance: "700 m", category: "gastronomy" },
  { name: "Quintal do Espeto", distance: "1,8 km", category: "gastronomy" },
  { name: "Bráz Quintal", distance: "2,4 km", category: "gastronomy" },
];

export const CATEGORY_ORDER: PoiCategory[] = ["mobility", "leisure", "education", "services", "gastronomy"];

export const VILA_PARK_COORDS = { lat: -23.585, lng: -46.641 } as const;

export const WHATSAPP_PHONE = "5511961007687";
