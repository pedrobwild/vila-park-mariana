// POIs no entorno do Vila Park — Vila Mariana (R. Baltazar Lisboa, 543).
// Distâncias conforme material oficial do empreendimento.
//
// Coordenadas:
//   - VILA_PARK_COORDS: verificado por triangulação com anúncios de imóveis
//     vizinhos (nº 524 da mesma rua) em QuintoAndar/Loft.
//   - precision "verified" = fonte externa confirmada (OSM/Wikipedia/site oficial).
//   - precision "approx"   = posição estimada na via/quadra correta,
//     validada por consistência com a distância oficial; pendente de
//     confirmação em campo.

export type PoiCategory = "leisure" | "mobility" | "education" | "services" | "gastronomy";
export type PoiPrecision = "verified" | "approx";

export interface Poi {
  name: string;
  distance: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  precision: PoiPrecision;
}

export const VILA_PARK_COORDS = { lat: -23.5847, lng: -46.6303 } as const;
export const VILA_PARK_ADDRESS = "R. Baltazar Lisboa, 543 — Vila Mariana, SP";

export const POIS: Poi[] = [
  // Lazer
  { name: "Parque da Aclimação", distance: "950 m", category: "leisure", lat: -23.57472, lng: -46.62889, precision: "verified" },
  { name: "Museu da Matemática", distance: "1 km",  category: "leisure", lat: -23.5775,  lng: -46.6330,  precision: "approx" },
  { name: "Comedy Sampa Club",   distance: "1,4 km",category: "leisure", lat: -23.5725,  lng: -46.6295,  precision: "approx" },
  { name: "SESC",                distance: "2,2 km",category: "leisure", lat: -23.5972,  lng: -46.6395,  precision: "approx" },
  { name: "Av. Paulista",        distance: "2,5 km",category: "leisure", lat: -23.5705,  lng: -46.6415,  precision: "verified" },
  { name: "Parque Ibirapuera",   distance: "3,1 km",category: "leisure", lat: -23.5872,  lng: -46.6574,  precision: "verified" },
  { name: "MASP",                distance: "4,2 km",category: "leisure", lat: -23.5614,  lng: -46.6555,  precision: "verified" },
  // Mobilidade
  { name: "Metrô Vila Mariana",  distance: "900 m", category: "mobility", lat: -23.5894, lng: -46.6347, precision: "verified" },
  { name: "Metrô Ana Rosa",      distance: "1,1 km",category: "mobility", lat: -23.58144,lng: -46.63838,precision: "verified" },
  // Educação
  { name: "FMU",                 distance: "850 m", category: "education", lat: -23.5795, lng: -46.6350, precision: "approx" },
  { name: "Univ. Belas Artes",   distance: "1,5 km",category: "education", lat: -23.5975, lng: -46.6355, precision: "approx" },
  { name: "ESPM",                distance: "1,5 km",category: "education", lat: -23.5983, lng: -46.6360, precision: "approx" },
  // Serviços
  { name: "Drogasil",            distance: "500 m", category: "services", lat: -23.5860, lng: -46.6335, precision: "approx" },
  { name: "Smart Fit",           distance: "950 m", category: "services", lat: -23.5885, lng: -46.6345, precision: "approx" },
  { name: "Vila das Frutas",     distance: "1 km",  category: "services", lat: -23.5890, lng: -46.6370, precision: "approx" },
  { name: "Kalunga",             distance: "1 km",  category: "services", lat: -23.5905, lng: -46.6355, precision: "approx" },
  { name: "Leroy Merlin",        distance: "1,9 km",category: "services", lat: -23.5960, lng: -46.6250, precision: "approx" },
  { name: "Shopping Santa Cruz", distance: "2,2 km",category: "services", lat: -23.59904,lng: -46.63668,precision: "verified" },
  { name: "Shopping Paulista",   distance: "2,5 km",category: "services", lat: -23.5701, lng: -46.6434, precision: "approx" },
  // Gastronomia
  { name: "Veloso Bar",          distance: "700 m", category: "gastronomy", lat: -23.5877, lng: -46.6352, precision: "approx" },
  { name: "Quintal do Espeto",   distance: "1,8 km",category: "gastronomy", lat: -23.5920, lng: -46.6440, precision: "approx" },
  { name: "Bráz Quintal",        distance: "2,4 km",category: "gastronomy", lat: -23.5680, lng: -46.6255, precision: "approx" },
];

export const CATEGORY_ORDER: PoiCategory[] = ["mobility", "leisure", "education", "services", "gastronomy"];

export const WHATSAPP_PHONE = "5511961007687";
