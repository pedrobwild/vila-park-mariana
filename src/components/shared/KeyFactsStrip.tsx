import { PROPERTY } from "@/data/propertyData";
import { useTranslation } from "react-i18next";

interface Fact { value: string; label: string }

export default function KeyFactsStrip({
  variant = "default",
  facts,
  className = "",
}: {
  variant?: "default" | "onDark";
  facts?: Fact[];
  className?: string;
}) {
  const { t } = useTranslation();
  const items: Fact[] = facts ?? [
    { value: String(PROPERTY.floors), label: t("keyFacts.floors", "Pavimentos") },
    { value: String(PROPERTY.units), label: t("keyFacts.units", "Apartamentos") },
    { value: `${PROPERTY.builtAreaSqm.toLocaleString("pt-BR")} m²`, label: t("keyFacts.area", "Construídos") },
    { value: "900 m", label: t("keyFacts.metro", "Do metrô Vila Mariana") },
  ];

  const numColor = variant === "onDark" ? "text-primary-foreground" : "text-foreground";
  const labelColor = variant === "onDark" ? "text-primary-foreground/70" : "text-muted-foreground";
  const dividerColor = variant === "onDark" ? "bg-primary-foreground/20" : "bg-border";

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x ${variant === "onDark" ? "divide-primary-foreground/15" : "divide-border/60"} ${className}`}>
      {items.map((f, i) => (
        <div key={f.label} className={`px-4 py-4 md:py-3 ${i > 0 && i % 2 === 1 ? "border-l md:border-l-0" : ""} ${variant === "onDark" ? "border-primary-foreground/15" : "border-border/60"}`}>
          <p className={`font-display font-medium tabular text-3xl md:text-4xl leading-none ${numColor}`}>
            {f.value}
          </p>
          <p className={`mt-2 text-[11px] uppercase tracking-[0.14em] font-medium ${labelColor}`}>
            {f.label}
          </p>
        </div>
      ))}
      <span className={`sr-only ${dividerColor}`} />
    </div>
  );
}
