import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MapPin, Ruler, DollarSign, TrendingUp, Calendar, Home, Camera, Rocket, BarChart3, Anchor } from "lucide-react";
import SectionBlock from "./SectionBlock";

const KPI_ITEMS = [
  { label: "Bairro", value: "Pinheiros", icon: MapPin },
  { label: "Metragem", value: "28 m²", icon: Ruler },
  { label: "Receita", value: "R$ 9.348/mês", icon: DollarSign },
  { label: "Yield bruto", value: "29,1%", icon: TrendingUp },
];

const INVESTMENT = [
  { label: "Imóvel", value: "R$ 325.000" },
  { label: "Reforma", value: "R$ 32.000" },
  { label: "Decoração", value: "R$ 28.000" },
];

const TIMELINE = [
  { period: "Mês 1–2", title: "Compra + reforma", desc: "Aquisição, reforma inteligente e marcenaria planejada", icon: Home },
  { period: "Mês 3", title: "Decoração + fotos", desc: "Design premium, enxoval e sessão fotográfica profissional", icon: Camera },
  { period: "Mês 4", title: "Lançamento", desc: "Anúncio otimizado + preço dinâmico + primeiras reservas", icon: Rocket },
  { period: "Mês 5–10", title: "Ramp-up", desc: "Construção de reviews, ajustes de preço, ocupação crescente", icon: BarChart3 },
  { period: "Mês 11+", title: "Cruzeiro", desc: "Operação estável, receita previsível, payback atingido", icon: Anchor },
];

export default function CaseStudySection() {
  return (
    <SectionBlock
      id="casestudy"
      title="Case Study: Studio em Pinheiros"
      takeaway="Exemplo real de um studio operado com a metodologia deste guia."
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {KPI_ITEMS.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <kpi.icon size={18} className="text-primary mx-auto mb-2" />
                <p className="font-display text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Investment breakdown */}
      <Card className="border-border mb-8">
        <CardContent className="p-5">
          <h4 className="font-display font-bold text-foreground mb-3">Composição do investimento</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            {INVESTMENT.map((item) => (
              <div key={item.label} className="bg-muted/40 rounded-lg p-3">
                <p className="font-display font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-muted/40 rounded-lg p-3 text-center">
            <p className="font-display text-lg font-bold text-primary">R$ 385.000</p>
            <p className="text-xs text-muted-foreground">Investimento total</p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <h3 className="font-display text-xl font-bold text-foreground mb-4">Timeline do projeto</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border hidden md:block" />

        <div className="space-y-4">
          {TIMELINE.map((step, i) => (
            <motion.div
              key={step.period}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-4"
            >
              <div className="relative z-10 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon size={18} className="text-primary" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-primary font-body">{step.period}</span>
                  <span className="text-sm font-display font-bold text-foreground">{step.title}</span>
                </div>
                <p className="text-sm text-muted-foreground font-body">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Case baseado em dados reais de operação Bwild. Resultados variam por unidade, localização e execução.
      </p>
    </SectionBlock>
  );
}
