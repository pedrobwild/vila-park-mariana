// Plantas do Vila Park — Vila Mariana.
// Estruturamos como "pavimentos" (o empreendimento fornece plantas por
// pavimento, não por unidade). URLs absolutas do site oficial.

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
  /** Absolute URL to the floor-plan image */
  plantaFile: string;
  variants?: TipologiaVariant[];
}

export const tipologias: Tipologia[] = [
  {
    id: "terreo",
    name: "Térreo",
    area: "Pavimento",
    bedrooms: "Lazer + acessos",
    bathrooms: "—",
    highlights: ["Portaria e acessos", "Áreas comuns decoradas"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimento-terreo-vila-park.jpg",
  },
  {
    id: "pav-1",
    name: "1º pavimento",
    area: "Pavimento",
    bedrooms: "Unidades",
    bathrooms: "—",
    highlights: ["Distribuição das unidades", "Circulações"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimento-1-vila-park.jpg",
  },
  {
    id: "pav-2-3",
    name: "2º e 3º pavimentos",
    area: "Pavimentos",
    bedrooms: "Unidades",
    bathrooms: "—",
    highlights: ["Plantas repetidas", "Distribuição das unidades"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimentos-2-e-3-vila-park.jpg",
  },
  {
    id: "pav-4",
    name: "4º pavimento",
    area: "Pavimento",
    bedrooms: "Unidades",
    bathrooms: "—",
    highlights: ["Distribuição das unidades"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimento-4-vila-park.jpg",
  },
  {
    id: "pav-5",
    name: "5º pavimento",
    area: "Pavimento",
    bedrooms: "Lazer + unidades",
    bathrooms: "—",
    highlights: ["Áreas comuns decoradas", "Lazer no meio da torre"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimento-5-vila-park.jpg",
  },
  {
    id: "pav-6-9",
    name: "6º ao 9º pavimento",
    area: "Pavimentos",
    bedrooms: "Unidades",
    bathrooms: "—",
    highlights: ["Plantas repetidas", "Distribuição das unidades"],
    plantaFile: "https://vilaparkmariana.com.br/wp-content/uploads/2024/05/planta-em-alta-com-ampliacao-pavimento-6-ao-9-vila-park.jpg",
  },
];

export function getPlantaUrl(t: Tipologia): string {
  // Absolute URL — return as-is. Kept as a function for API stability.
  if (t.plantaFile.startsWith("http")) return t.plantaFile;
  const base = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images`;
  return `${base}/plantas/${t.plantaFile}`;
}

export function getProjetosFolder(tipologiaId: string): string {
  return `projetos3d/${tipologiaId}`;
}

export function getStorageBase(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images`;
}
