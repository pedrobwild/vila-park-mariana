import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { TYPOLOGIES, type Typology } from "@/data/propertyData";
import { quizStorage } from "./persistence";

type Q = {
  id: "objective" | "strategy" | "horizon" | "risk";
  question: string;
  options: { value: string; label: string; hint: string }[];
};

const QUESTIONS: Q[] = [
  {
    id: "objective",
    question: "Qual é seu objetivo principal com o Vila Park?",
    options: [
      { value: "renda", label: "Renda mensal recorrente", hint: "Fluxo de caixa constante." },
      { value: "valorizacao", label: "Valorização patrimonial", hint: "Compra na planta, ganho na entrega." },
      { value: "equilibrio", label: "Equilíbrio entre os dois", hint: "Renda + valorização." },
    ],
  },
  {
    id: "strategy",
    question: "Qual estratégia de locação faz mais sentido para você?",
    options: [
      { value: "tradicional", label: "Aluguel tradicional (12+ meses)", hint: "Menos gestão, receita previsível." },
      { value: "temporada", label: "Temporada / short stay", hint: "Diárias mais altas, mais operação." },
      { value: "indeciso", label: "Ainda estou avaliando", hint: "Quero comparar os dois modelos." },
    ],
  },
  {
    id: "horizon",
    question: "Qual o horizonte pretendido do investimento?",
    options: [
      { value: "curto", label: "Curto (< 3 anos)", hint: "Foco em rentabilidade rápida." },
      { value: "medio", label: "Médio (3–7 anos)", hint: "Ciclo típico de renda + valorização." },
      { value: "longo", label: "Longo (7+ anos)", hint: "Formação de patrimônio." },
    ],
  },
  {
    id: "risk",
    question: "Como você descreveria sua tolerância a risco?",
    options: [
      { value: "conservador", label: "Conservador", hint: "Prefiro previsibilidade." },
      { value: "moderado", label: "Moderado", hint: "Aceito algum risco por retorno maior." },
      { value: "arrojado", label: "Arrojado", hint: "Busco o maior retorno possível." },
    ],
  },
];

type Answers = Partial<Record<Q["id"], string>>;

function recommend(answers: Answers): { typo: Typology; profile: string; rationale: string } {
  const { objective, strategy, risk } = answers;
  // studio = arrojado / renda / ticket menor
  // garden = equilibrado / valorizacao ou moradia longa
  // terrace = equilibrado com foco valorização/lazer
  if (risk === "arrojado" || strategy === "temporada" || objective === "renda") {
    return {
      typo: TYPOLOGIES.find((t) => t.id === "studio")!,
      profile: "Arrojado — foco em renda",
      rationale:
        "O studio/1 dorm. tem o menor ticket de entrada, maior liquidez de locação perto do metrô e é o formato mais compatível com short stay ou aluguel para estudantes/jovens profissionais.",
    };
  }
  if (objective === "valorizacao" || risk === "conservador") {
    return {
      typo: TYPOLOGIES.find((t) => t.id === "terrace")!,
      profile: "Conservador — foco em valorização",
      rationale:
        "Unidades com terraço descoberto costumam sustentar melhor o valor de revenda em bairros consolidados como a Vila Mariana e atendem inquilinos que permanecem por mais tempo.",
    };
  }
  return {
    typo: TYPOLOGIES.find((t) => t.id === "garden")!,
    profile: "Equilibrado — renda + valorização",
    rationale:
      "O apartamento com garden privativo combina diferencial de produto (área externa) com boa liquidez de locação de longo prazo, equilibrando fluxo mensal e potencial de valorização.",
  };
}

export default function InvestorQuizCard({ onResult }: { onResult?: (typoId: string) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const finished = step >= QUESTIONS.length;
  const current = QUESTIONS[step];

  const pick = (v: string) => {
    const next = { ...answers, [current.id]: v };
    setAnswers(next);
    if (step + 1 >= QUESTIONS.length) {
      setStep(step + 1);
      const rec = recommend(next);
      onResult?.(rec.typo.id);
    } else {
      setStep(step + 1);
    }
  };

  const reset = () => {
    setAnswers({});
    setStep(0);
  };

  const rec = finished ? recommend(answers) : null;

  return (
    <Card className="card-elevated border-accent/20">
      <CardContent className="p-5 md:p-7">
        {!finished ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10">
                  Pergunta {step + 1} de {QUESTIONS.length}
                </Badge>
                <div className="flex gap-1">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={cn("h-1.5 w-8 rounded-full", i <= step ? "bg-accent" : "bg-muted")}
                    />
                  ))}
                </div>
              </div>

              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-4">
                {current.question}
              </h3>

              <div className="grid gap-2.5">
                {current.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => pick(opt.value)}
                    className="text-left rounded-xl border border-border/70 hover:border-accent hover:bg-accent/5 transition-colors p-4 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{opt.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{opt.hint}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Seu resultado
              </p>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {rec!.profile}
            </h3>
            <p className="text-muted-foreground mt-2">
              Com base nas suas respostas, a tipologia mais alinhada ao seu perfil no Vila Park é:
            </p>

            <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">
                    {rec!.typo.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {rec!.rationale}
                  </p>
                  <ul className="mt-3 grid gap-1.5">
                    {rec!.typo.highlights.map((h) => (
                      <li key={h} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-accent">•</span> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <Button
                onClick={() => {
                  const el = document.getElementById("simulador");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground min-h-[46px]"
              >
                Simular retorno para essa tipologia
              </Button>
              <Button variant="outline" onClick={reset} className="min-h-[46px]">
                <RotateCcw className="mr-2 h-4 w-4" /> Refazer diagnóstico
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
