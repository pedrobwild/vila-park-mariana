import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Train, GraduationCap, Trees, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { POIS, CATEGORY_ORDER, type PoiCategory } from "@/data/surroundings";
import SectionLabel from "@/components/shared/SectionLabel";

const ICON: Record<PoiCategory, typeof Train> = {
  mobility: Train,
  education: GraduationCap,
  leisure: Trees,
  services: ShoppingBag,
  gastronomy: UtensilsCrossed,
};

const LABEL_KEY: Record<PoiCategory, string> = {
  mobility: "surroundings.mobility",
  education: "surroundings.education",
  leisure: "surroundings.leisure",
  services: "surroundings.services",
  gastronomy: "surroundings.gastronomy",
};

interface Props {
  variant?: "compact" | "full";
  className?: string;
  headerless?: boolean;
}

export default function NeighborhoodSection({ variant = "full", className = "", headerless = false }: Props) {
  const { t } = useTranslation();
  const limit = variant === "compact" ? 4 : Infinity;

  return (
    <section className={className}>
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-20">
        {!headerless && (
          <>
            <SectionLabel>{t("surroundings.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground max-w-2xl">
              {t("surroundings.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("surroundings.subtitle")}</p>
          </>
        )}

        <div className={`mt-8 grid gap-4 ${variant === "compact" ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {CATEGORY_ORDER.map((cat) => {
            const items = POIS.filter((p) => p.category === cat).slice(0, limit);
            if (items.length === 0) return null;
            const Icon = ICON[cat];
            return (
              <Card key={cat} className="card-elevated border-border/60 h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    <h3 className="font-display text-lg text-foreground">{t(LABEL_KEY[cat])}</h3>
                  </div>
                  <ul className="space-y-2">
                    {items.map((p) => (
                      <li key={p.name} className="flex items-center justify-between gap-3 text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-muted-foreground shrink-0 tabular">{p.distance}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
