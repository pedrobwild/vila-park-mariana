import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Building2, TrendingUp, Star, BarChart3, CheckCircle2,
} from "lucide-react";
import SectionBlock from "@/components/guide/SectionBlock";
import { useGuideDecision } from "@/hooks/useGuideDecision";
import { fmt } from "@/data/guide-data";
import { PROPERTY, TYPOLOGIES, calcFinancials, rankByYield, recommendTypology } from "@/data/propertyData";

export default function PropertyRecomendacaoSection() {
  const { investorProfile, hasProfile } = useGuideDecision();

  const ranked = rankByYield(PROPERTY.avgOccupancy);
  const recommended = hasProfile ? recommendTypology(investorProfile!.name) : null;

  return (
    <SectionBlock
      id="recomendacao"
      title="Comparativo de Retorno por Tipologia"
      takeaway={`Veja qual tipologia do ${PROPERTY.name} entrega o melhor retorno financeiro para o seu perfil.`}
    >
      {/* Typology comparison table */}
      <Card className="border-border overflow-hidden mb-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-secondary">
                <tr>
                  {["Tipologia", "Preço", "Diária", "Receita/ano", "Yield bruto", "Payback"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((t, i) => {
                  const isRecommended = recommended?.id === t.id;
                  const isBestYield = i === 0;
                  return (
                    <tr
                      key={t.id}
                      className={`border-t border-border transition-colors ${
                        isRecommended ? "bg-primary/5 font-medium" : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          {isRecommended && <Star className="h-3.5 w-3.5 text-primary shrink-0" />}
                          {isBestYield && !isRecommended && <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span>{t.label}</span>
                          {isRecommended && (
                            <Badge className="bg-primary/10 text-primary text-[10px] ml-1">Para você</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">R$ {fmt(t.purchasePrice)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">R$ {fmt(t.dailyEstimate)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">R$ {fmt(t.annualRevenue)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap font-bold ${isRecommended || isBestYield ? "text-primary" : "text-foreground"}`}>
                        {t.grossYield}%
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.paybackYears} anos</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Typology cards with highlights */}
      <h3 className="font-display text-lg font-bold text-foreground mb-4">Destaques por tipologia</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {TYPOLOGIES.map((t, i) => {
          const fin = calcFinancials(t, PROPERTY.avgOccupancy);
          const isRecommended = recommended?.id === t.id;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`border-border transition-all hover:shadow-md ${
                isRecommended ? "border-primary/40 bg-primary/[0.02]" : ""
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-display font-bold text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground">R$ {fmt(t.purchasePrice)} · {t.area} m²</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary text-lg">{fin.grossYield}%</p>
                      <p className="text-[10px] text-muted-foreground">yield bruto</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {t.highlights.map((h, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  {isRecommended && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <Badge className="bg-primary/10 text-primary text-xs">
                        ✦ Recomendada para o perfil {investorProfile!.name}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <BarChart3 className="text-primary mt-0.5 shrink-0" size={18} />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Insight:</strong> Tipologias menores tendem a ter yield bruto mais alto pela relação ticket × diária. Já as maiores oferecem menor vacância e público premium. A escolha ideal depende do seu perfil — {hasProfile
            ? `como ${investorProfile!.name}, a tipologia ${recommended?.label} é a mais alinhada.`
            : "complete o diagnóstico acima para receber uma recomendação personalizada."
          }
        </p>
      </div>
    </SectionBlock>
  );
}
