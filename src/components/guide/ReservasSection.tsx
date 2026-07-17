import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { trackGlobal } from "@/hooks/useGuideAnalytics";
import SectionBlock from "./SectionBlock";
import { DECISION_DRIVERS, PERSONAS, type PersonaKey } from "@/data/guide-data";

export default function ReservasSection() {
  const [persona, setPersona] = useState<PersonaKey>("executivo");
  const sortedDrivers = useMemo(() => [...DECISION_DRIVERS].sort((a, b) => a.priority[persona] - b.priority[persona]), [persona]);

  return (
    <SectionBlock id="reservas" title="O que realmente move reservas" takeaway="Os 6 fatores que transformam um studio vazio em máquina de reservas.">
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3 font-body">Filtrar por perfil do hóspede:</p>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <Button key={p.key} size="sm" variant={persona === p.key ? "default" : "outline"}
              onClick={() => { setPersona(p.key); trackGlobal("persona_toggle", { persona: p.key }); }}
              className={`min-h-[44px] px-4 ${persona === p.key ? "bg-primary text-primary-foreground" : ""}`}>
              <p.icon size={14} className="mr-1.5" />{p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sortedDrivers.map((driver, i) => (
          <motion.div key={driver.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
            <Card className={`border-border h-full ${i === 0 ? "border-primary/40 border-2 bg-primary/5" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-primary/15" : "bg-secondary"}`}>
                    <driver.icon className={i === 0 ? "text-primary" : "text-muted-foreground"} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="font-body text-xs">#{i + 1}</Badge>
                      <p className="font-semibold text-foreground text-sm">{driver.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{driver.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="bg-muted rounded-lg p-4 font-body">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fontes</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Airbnb Global Quality Report — fatores de qualidade e drivers de decisão</li>
          <li>• AHLA (American Hotel & Lodging Association) — estatística de prioridade de limpeza</li>
          <li>• Expedia Group 2025 Traveler Value Index — influência de social proof na decisão</li>
          <li>• Annals of Tourism Research: Empirical Insights — categorias de amenidades e experiência do hóspede</li>
        </ul>
      </div>
      <Accordion type="multiple" className="mt-4 font-body">
        <AccordionItem value="interpretar">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Como interpretar esses drivers</AccordionTrigger>
          <AccordionContent><p className="text-sm text-muted-foreground leading-relaxed">Cada driver tem peso diferente por persona. Executivos priorizam check-in rápido e Wi-Fi estável para reuniões. Turistas priorizam localização e experiência visual. Estudantes valorizam preço e avaliações de outros hóspedes. Use os filtros de persona acima para ver a priorização e adapte seu studio ao público dominante do bairro.</p></AccordionContent>
        </AccordionItem>
        <AccordionItem value="fontes">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Fontes dos dados</AccordionTrigger>
          <AccordionContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong className="text-foreground">Airbnb Global Quality Report</strong> — Fatores de qualidade e drivers de decisão baseados em milhões de reviews globais</li>
              <li>• <strong className="text-foreground">AHLA (American Hotel & Lodging Association)</strong> — Estatística de que 90% dos hóspedes consideram limpeza o critério #1</li>
              <li>• <strong className="text-foreground">Expedia Group 2025 Traveler Value Index</strong> — Influência de social proof (avaliações, nota) na taxa de conversão</li>
              <li>• <strong className="text-foreground">Annals of Tourism Research: Empirical Insights</strong> — Categorias de amenidades e impacto na experiência do hóspede</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="pratica">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Como aplicar na prática</AccordionTrigger>
          <AccordionContent><p className="text-sm text-muted-foreground leading-relaxed">Priorize os 3 primeiros drivers da persona dominante do seu bairro. Em Pinheiros (público misto executivo/turista), foque em limpeza impecável + check-in digital + fotos reais. Em Vila Mariana (mais estudantes e casais), priorize avaliações altas + preço competitivo + ambiente confortável para estadias longas. O segredo é alinhar produto e operação ao perfil real de quem reserva na sua região.</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
