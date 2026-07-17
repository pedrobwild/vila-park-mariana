import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, ChevronLeft, CheckCircle2,
  Banknote, TrendingUp, Scale, Shield, Gauge, Rocket,
  CalendarCheck, ArrowUpRight, Sparkles, User, Building2,
} from "lucide-react";
import SectionBlock from "@/components/guide/SectionBlock";
import { QUIZ_QUESTIONS, resolveProfile, type QuizAnswers } from "@/lib/investorQuiz";
import { useGuideDecision } from "@/hooks/useGuideDecision";
import { recommendTypology, calcFinancials, PROPERTY } from "@/data/propertyData";
import { fmt } from "@/data/guide-data";

const ICON_MAP: Record<string, any> = {
  Banknote, TrendingUp, Scale, Shield, Gauge, Rocket,
  CalendarCheck, ArrowUpRight, Sparkles,
};

export default function PropertyDiagnosticoSection() {
  const { investorProfile, setInvestorDiagnostic } = useGuideDecision();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQ = QUIZ_QUESTIONS[step];
  const totalSteps = QUIZ_QUESTIONS.length;
  const isComplete = !!investorProfile;

  const selectOption = (questionId: string, value: string) => {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);

    if (step < totalSteps - 1) {
      setTimeout(() => setStep(step + 1), 300);
    } else {
      const quizAnswers: QuizAnswers = {
        objective: next.objective || "equilibrio",
        risk: next.risk || "moderado",
        priority: next.priority || "retorno",
      };
      const profile = resolveProfile(quizAnswers);
      setInvestorDiagnostic(quizAnswers, profile);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setInvestorDiagnostic({ objective: "", risk: "", priority: "" }, null as any);
  };

  // Recommended typology when profile is complete
  const recommended = isComplete ? recommendTypology(investorProfile.name) : null;
  const recFinancials = recommended ? calcFinancials(recommended, PROPERTY.avgOccupancy) : null;

  return (
    <SectionBlock
      id="diagnostico"
      title="Qual é o seu perfil de investidor?"
      takeaway="Responda 3 perguntas rápidas para descobrir qual tipologia do Urban Flex Bela Cintra maximiza seu retorno."
    >
      {!isComplete ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            {QUIZ_QUESTIONS.map((_, i) => (
              <div key={i} className={`h-2 w-8 rounded-full transition-all duration-300 ${
                i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted"
              }`} />
            ))}
            <span className="text-xs text-muted-foreground font-body ml-1">
              {step + 1} de {totalSteps}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-display text-xl font-bold text-foreground mb-1">
                {currentQ.question}
              </h3>
              <p className="text-sm text-muted-foreground font-body mb-5">
                {currentQ.subtitle}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  const Icon = ICON_MAP[opt.icon] || Target;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(currentQ.id, opt.value)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                          <Icon size={18} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <span className="font-display font-bold text-foreground text-sm">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-body leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>

              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="mt-4 text-muted-foreground">
                  <ChevronLeft size={14} className="mr-1" /> Voltar
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-2 border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={28} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${investorProfile.color} ${investorProfile.textColor} font-body text-xs`}>
                      {investorProfile.name}
                    </Badge>
                    <CheckCircle2 size={16} className="text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                    {investorProfile.description}
                  </p>

                  {/* Profile weights */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {Object.entries(investorProfile.weights).map(([key, weight]) => {
                      const labels: Record<string, string> = {
                        retorno: "Retorno", demanda: "Demanda", operacao: "Operação", futuro: "Futuro",
                      };
                      const pct = Math.round((weight as number) * 100);
                      return (
                        <div key={key} className="text-center">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs font-body">
                            <span className="font-semibold text-foreground">{pct}%</span>{" "}
                            <span className="text-muted-foreground">{labels[key]}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Typology recommendation */}
              {recommended && recFinancials && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-primary" />
                    <p className="text-sm font-display font-bold text-foreground">
                      Tipologia recomendada para você
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-base font-display font-bold text-foreground">{recommended.label}</p>
                      <p className="text-[10px] text-muted-foreground">Tipologia</p>
                    </div>
                    <div>
                      <p className="text-base font-display font-bold text-foreground">R$ {fmt(recommended.purchasePrice)}</p>
                      <p className="text-[10px] text-muted-foreground">Investimento</p>
                    </div>
                    <div>
                      <p className="text-base font-display font-bold text-primary">{recFinancials.grossYield}%</p>
                      <p className="text-[10px] text-muted-foreground">Yield bruto</p>
                    </div>
                    <div>
                      <p className="text-base font-display font-bold text-foreground">{recFinancials.paybackYears} anos</p>
                      <p className="text-[10px] text-muted-foreground">Payback</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use o simulador abaixo para ajustar ocupação e diária e comparar com outras tipologias.
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-end">
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground">
                  Refazer diagnóstico
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </SectionBlock>
  );
}
