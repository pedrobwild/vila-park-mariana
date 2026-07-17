export interface TipologiaVariant {
  variantId: string;
  label: string;
  projetosFolder: string;
  orcamentoUrl: string;
}

export interface Tipologia {
  id: string;
  name: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  highlights: string[];
  plantaFile: string; // filename in plantas/ folder
  variants?: TipologiaVariant[]; // when multiple project lines exist
}

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images`;

export const tipologias: Tipologia[] = [
  {
    id: "19",
    name: "Studio Compacto",
    area: "19 m²",
    bedrooms: "Integrado",
    bathrooms: "1",
    highlights: ["Entrada acessível", "Ideal para Airbnb", "Alta liquidez"],
    plantaFile: "planta-19m2.png",
  },
  {
    id: "38",
    name: "Studio Confort",
    area: "38 m²",
    bedrooms: "1 suíte",
    bathrooms: "1",
    highlights: ["Living amplo", "Piso chevron", "Cozinha completa"],
    plantaFile: "planta-38m2.png",
    variants: [
      {
        variantId: "38-collection",
        label: "Bwild Collection",
        projetosFolder: "projetos3d/38-collection",
        orcamentoUrl: "https://envision-build-guide.lovable.app/o/7d9a7b268320",
      },
      {
        variantId: "38",
        label: "Bwild Signature",
        projetosFolder: "projetos3d/38",
        orcamentoUrl: "https://orcamento-bwild.lovable.app/o/bc1ff5cfc7b9",
      },
    ],
  },
  {
    id: "40",
    name: "Studio Premium",
    area: "40 m²",
    bedrooms: "1 suíte",
    bathrooms: "1",
    highlights: ["Varanda gourmet", "Sala de estar separada", "Acabamento premium"],
    plantaFile: "planta-40m2.png",
  },
  {
    id: "54",
    name: "Flat Executive",
    area: "54 m²",
    bedrooms: "1 suíte",
    bathrooms: "1 lavabo",
    highlights: ["Mesa de jantar 6 lugares", "Closet", "Pé-direito generoso"],
    plantaFile: "planta-54m2.png",
  },
  {
    id: "76",
    name: "Duplex Assinatura",
    area: "76 m²",
    bedrooms: "1 suíte + living",
    bathrooms: "2",
    highlights: ["Dois pavimentos", "Layout versátil", "Design autoral"],
    plantaFile: "planta-76m2.jpg",
  },
  {
    id: "80",
    name: "Cobertura Garden",
    area: "83 m²",
    bedrooms: "1 suíte",
    bathrooms: "1",
    highlights: ["Área externa privativa", "Jacuzzi", "Espaço gourmet"],
    plantaFile: "planta-80m2.png",
  },
];

export function getPlantaUrl(t: Tipologia): string {
  return `${STORAGE_BASE}/plantas/${t.plantaFile}`;
}

export function getProjetosFolder(tipologiaId: string): string {
  return `projetos3d/${tipologiaId}`;
}

export function getStorageBase(): string {
  return STORAGE_BASE;
}
