import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import SectionBlock from "@/components/guide/SectionBlock";
import { PROPERTY, TYPOLOGIES, calcFinancials } from "@/data/propertyData";

const BENCHMARKS = [
  {
    id: "property",
    label: "Urban Flex (média)",
    icon: BarChart3,
    description: "Yield líquido médio das tipologias do empreendimento",
    color: "bg-primary",
    isProperty: true,
  },
  {
    id: "selic",
    label: "Selic (Tesouro)",
    yieldAnnual: 14.75,
    description: "Taxa básica — 14,75% mar/2026 (Copom)",
    color: "bg-emerald-500",
  },
  {
    id: "cdi",
    label: "CDB 100% CDI",
    yieldAnnual: 14.65,
    description: "Aplicação bancária atrelada ao CDI",
    color: "bg-emerald-400",
  },
  {
    id: "fii",
    label: "FIIs (média IFIX)",
    yieldAnnual: 11.2,
    description: "Dividend yield médio 12 meses dos FIIs",
    color: "bg-sky-500",
  },
  {
    id: "poupanca",
    label: "Poupança",
    yieldAnnual: 7.6,
    description: "Rendimento com Selic acima de 8,5%",
    color: "bg-muted-foreground/60",
  },
];

export default function PropertyBenchmarkSection() {
  const avgPropertyYield = useMemo(() => {
    const yields = TYPOLOGIES.map((t) => calcFinancials(t, PROPERTY.avgOccupancy).netYieldEstimate);
    return yields.reduce((a, b) => a + b, 0) / yields.length;
  }, []);

  const allItems = useMemo(() => {
    const items = BENCHMARKS.map((b) => {
      if (b.isProperty) {
        return { ...b, netYield: avgPropertyYield };
      }
      // FIIs são isentos de IR para PF; Selic/CDI descontam 15%
      const net = (b.id === "poupanca" || b.id === "fii") ? b.yieldAnnual! : b.yieldAnnual! * 0.85;
      return { ...b, netYield: net };
    });
    return items.sort((a, b) => b.netYield - a.netYield);
  }, [avgPropertyYield]);

  const maxYield = Math.max(...allItems.map((i) => i.netYield));

  return (
    <SectionBlock
      id="benchmark"
      title="Comparativo com Outros Investimentos"
      takeaway="Yield líquido estimado do empreendimento vs. renda fixa e fundos imobiliários."
    >
      <p className="text-sm text-muted-foreground font-body mb-6">
        Comparação do <strong className="text-foreground">yield líquido estimado</strong> (descontando custos operacionais ou IR) do {PROPERTY.name} com as principais alternativas de investimento do mercado.
      </p>

      <Card className="border-border mb-6">
        <CardContent className="p-6 space-y-4">
          {allItems.map((item, i) => {
            const barWidth = Math.max((item.netYield / maxYield) * 100, 6);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-32 sm:w-40 shrink-0 text-right">
                  <p className={`text-xs font-medium truncate ${item.isProperty ? "text-primary font-bold" : "text-foreground"}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex-1 h-9 bg-muted/40 rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barWidth}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-lg ${item.isProperty ? "bg-primary" : item.color} flex items-center justify-end pr-2`}
                  >
                    <span className="text-[11px] font-bold text-white whitespace-nowrap">
                      {item.netYield.toFixed(1)}%
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Insight */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <BarChart3 className="text-primary mt-0.5 shrink-0" size={18} />
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong className="text-foreground">Por que comparar?</strong> A renda fixa paga juros sobre o capital, mas o imóvel para short stay combina <strong className="text-foreground">renda recorrente + valorização patrimonial</strong>. Em cenários de queda da Selic, o yield do imóvel se mantém enquanto a renda fixa diminui.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Selic 14,75% e CDI: mar/2026 (Copom) · IFIX: DY 12 meses (isento de IR para PF) · Poupança: regra Selic &gt; 8,5%. Yield do imóvel: média das tipologias com {PROPERTY.avgOccupancy}% ocupação, descontando ~25% de custos operacionais.
          </p>
        </div>
      </div>
    </SectionBlock>
  );
}