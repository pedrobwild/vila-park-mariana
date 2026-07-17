import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Building2, Home, MapPin, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";
import SectionBlock from "./SectionBlock";

const CATEGORIES = [
  {
    key: "predio",
    label: "Prédio",
    icon: Building2,
    items: [
      "Permite short stay (sem restrição em convenção)",
      "Portaria 24h ou controle de acesso",
      "Áreas comuns relevantes (academia, coworking, lavanderia)",
      "Bom estado de conservação e manutenção",
      "Vizinhança sem histórico de reclamações contra locação curta",
    ],
  },
  {
    key: "unidade",
    label: "Unidade",
    icon: Home,
    items: [
      "Metragem eficiente (20–40 m²)",
      "Planta inteligente (sem corredores desperdiçados)",
      "Boa insolação e ventilação natural",
      "Andar alto ou posição com menos ruído",
      "Banheiro com ventilação (janela ou exaustão)",
      "Varanda ou sacada (diferencial competitivo)",
    ],
  },
  {
    key: "localizacao",
    label: "Localização",
    icon: MapPin,
    items: [
      "Próximo a metrô ou transporte público",
      "Bairro com demanda comprovada para short stay",
      "Comércio, restaurantes e serviços a pé",
      "Região percebida como segura",
      "Mercado não saturado (concorrência saudável)",
    ],
  },
];

const TOTAL_ITEMS = CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);

function getTier(score: number) {
  if (score <= 5) return { label: "Alto risco", color: "text-destructive", stroke: "stroke-destructive", bg: "bg-destructive/10", desc: "A unidade tem gaps importantes. Revise antes de avançar." };
  if (score <= 9) return { label: "Potencial com ressalvas", color: "text-amber-600", stroke: "stroke-amber-500", bg: "bg-amber-500/10", desc: "Há oportunidade, mas itens críticos precisam de atenção." };
  if (score <= 13) return { label: "Boa oportunidade", color: "text-primary/80", stroke: "stroke-primary/70", bg: "bg-primary/10", desc: "Ativo sólido. Foque nos itens pendentes para maximizar retorno." };
  return { label: "Excelente ativo", color: "text-primary", stroke: "stroke-primary", bg: "bg-primary/10", desc: "Perfil ideal para short stay. Avance com confiança." };
}

function ScoreCircle({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? score / total : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const tier = getTier(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
          <circle
            cx="60" cy="60" r={r} fill="none" strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${tier.stroke} transition-all duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-3xl font-bold ${tier.color}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ {total}</span>
        </div>
      </div>
      <Badge className={`${tier.bg} ${tier.color} font-body text-sm px-3 py-1`}>{tier.label}</Badge>
      <p className="text-sm text-muted-foreground text-center max-w-xs">{tier.desc}</p>
    </div>
  );
}

export default function EscolhaAtivoSection() {
  const [checked, setChecked] = useState<Record<string, boolean[]>>(
    Object.fromEntries(CATEGORIES.map((cat) => [cat.key, new Array(cat.items.length).fill(false)]))
  );

  const toggle = useCallback((catKey: string, idx: number) => {
    setChecked((prev) => {
      const next = { ...prev, [catKey]: [...prev[catKey]] };
      next[catKey][idx] = !next[catKey][idx];
      return next;
    });
  }, []);

  const score = useMemo(
    () => Object.values(checked).flat().filter(Boolean).length,
    [checked]
  );

  const reset = () =>
    setChecked(Object.fromEntries(CATEGORIES.map((cat) => [cat.key, new Array(cat.items.length).fill(false)])));

  return (
    <SectionBlock
      id="escolha-ativo"
      title="Como avaliar a unidade antes de comprar"
      takeaway="Use este scoring para comparar ativos de forma objetiva antes de tomar a decisão."
    >
      {/* Scoring Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {CATEGORIES.map((cat) => (
          <Card key={cat.key} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cat.icon size={16} className="text-primary" />
                </div>
                <h4 className="font-display font-bold text-foreground">{cat.label}</h4>
                <span className="text-xs text-muted-foreground ml-auto">
                  {checked[cat.key].filter(Boolean).length}/{cat.items.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {cat.items.map((item, i) => (
                  <motion.label
                    key={item}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      checked={checked[cat.key][i]}
                      onCheckedChange={() => toggle(cat.key, i)}
                      className="mt-0.5"
                    />
                    <span className={`text-sm font-body leading-snug transition-colors ${checked[cat.key][i] ? "text-primary font-medium" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {item}
                    </span>
                  </motion.label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score Result */}
      <Card className="border-border mb-10">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <ScoreCircle score={score} total={TOTAL_ITEMS} />
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-display font-bold text-lg text-foreground mb-1">Score da unidade</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Quanto mais critérios atendidos, menor o risco e maior a probabilidade de boa performance em short stay.
            </p>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              <RotateCcw size={14} className="mr-1.5" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Operação vs Revenda */}
      <h3 className="font-display text-xl font-bold text-foreground mb-4">Operação vs. Revenda</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-primary" />
              <h4 className="font-display font-bold text-foreground">Bom para operação</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground font-body">
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Planta eficiente, fácil de montar e decorar</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Bairro com demanda real e comprovada</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Condomínio acessível que permite short stay</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />Preço permite yield saudável</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight size={16} className="text-amber-600" />
              <h4 className="font-display font-bold text-foreground">Bom para revenda</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground font-body">
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />Localização premium com valorização</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />Acabamento alto padrão</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />Metragem generosa (pode reduzir eficiência/m²)</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />Demanda pode não justificar o ADR necessário</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Accordions */}
      <Accordion type="multiple" className="font-body">
        <AccordionItem value="due-diligence">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Checklist de due diligence da unidade</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <div>
                <p className="font-semibold text-foreground mb-1">Documental</p>
                <p>Matrícula atualizada, certidão de ônus, convenção do condomínio, últimas atas de assembleia, IPTU em dia, habite-se.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Física</p>
                <p>Visite em horários diferentes (manhã, noite, fim de semana). Teste elétrica, hidráulica, pressão da água, acústica entre unidades.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Mercado</p>
                <p>Analise listings ativos no bairro, preço/m², demanda real de short stay, nível de saturação e reviews de concorrentes.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="metragem">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Metragem ideal e eficiência de planta</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O sweet spot para short stay fica entre 25 e 35 m². A regra prática: cama queen/casal + mesa de trabalho + sofá compacto + armário sem comprometer circulação. Abaixo de 20 m², o desconforto pode gerar reviews negativos. Acima de 50 m², o custo de aquisição e condomínio comprime o yield sem proporcional aumento de diária.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="condominio">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Restrições de condomínio: o que verificar</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>Leia a convenção do condomínio e o regimento interno. Procure por cláusulas sobre "locação por temporada", "estadias inferiores a 90 dias" ou "uso comercial".</p>
              <p><strong className="text-foreground">Sinais de alerta:</strong> proibição explícita, multas aplicadas, assembleia recente contra short stay.</p>
              <p><strong className="text-foreground">Sinais positivos:</strong> outros moradores já operando, administradora receptiva, sem reclamações formais registradas.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
