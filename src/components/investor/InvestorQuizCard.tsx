import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { TYPOLOGIES, type Typology } from "@/data/propertyData";
import { quizStorage } from "./persistence";

type QId = "objective" | "strategy" | "horizon" | "risk";

const QUESTIONS: { id: QId; optionKeys: string[] }[] = [
  { id: "objective", optionKeys: ["renda", "valorizacao", "equilibrio"] },
  { id: "strategy", optionKeys: ["tradicional", "temporada", "indeciso"] },
  { id: "horizon", optionKeys: ["curto", "medio", "longo"] },
  { id: "risk", optionKeys: ["conservador", "moderado", "arrojado"] },
];

type Answers = Partial<Record<QId, string>>;

// Chooses the typology; the profile label is derived separately from user's risk + objective.
function chooseTypology(answers: Answers): { typo: Typology; rationaleKey: "studio" | "garden" | "terrace" } {
  const { objective, strategy, risk } = answers;
  if (risk === "arrojado" || strategy === "temporada" || objective === "renda") {
    return { typo: TYPOLOGIES.find((t) => t.id === "studio")!, rationaleKey: "studio" };
  }
  if (objective === "valorizacao" || risk === "conservador") {
    return { typo: TYPOLOGIES.find((t) => t.id === "terrace")!, rationaleKey: "terrace" };
  }
  return { typo: TYPOLOGIES.find((t) => t.id === "garden")!, rationaleKey: "garden" };
}

export default function InvestorQuizCard({ onResult }: { onResult?: (typoId: string) => void }) {
  const { t } = useTranslation();
  // Lazy init from localStorage: JSON.parse runs once, not on every render.
  const [stored] = useState(() => (typeof window !== "undefined" ? quizStorage.load() : null));
  const [step, setStep] = useState(stored?.step ?? 0);
  const [answers, setAnswers] = useState<Answers>((stored?.answers as Answers) ?? {});
  const finished = step >= QUESTIONS.length;
  const current = QUESTIONS[step];

  // IMPORTANTE: NÃO emitimos onResult no mount. Isso evita sobrescrever a
  // tipologia que o usuário escolheu manualmente no simulador (também
  // persistida). O quiz só emite quando o usuário conclui/refaz nesta sessão.

  const rec = useMemo(() => (finished ? chooseTypology(answers) : null), [finished, answers]);

  const profileLabel = useMemo(() => {
    const riskKey = (answers.risk as "conservador" | "moderado" | "arrojado" | undefined) ?? "moderado";
    const focusKey =
      (answers.objective as "renda" | "valorizacao" | "equilibrio" | undefined) ?? "equilibrio";
    return t("investorQuiz.profile.template", {
      risk: t(`investorQuiz.profile.risk.${riskKey}`),
      focus: t(`investorQuiz.profile.focus.${focusKey}`),
    });
  }, [answers, t]);

  const pick = (v: string) => {
    const next = { ...answers, [current.id]: v };
    setAnswers(next);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= QUESTIONS.length) {
      const r = chooseTypology(next);
      onResult?.(r.typo.id);
      quizStorage.save({
        step: nextStep,
        answers: next as Record<string, string>,
        resultTypoId: r.typo.id,
      });
    } else {
      quizStorage.save({ step: nextStep, answers: next as Record<string, string> });
    }
  };

  const reset = () => {
    setAnswers({});
    setStep(0);
    quizStorage.clear();
  };

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
                  {t("investorQuiz.progress", { i: step + 1, n: QUESTIONS.length })}
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
                {t(`investorQuiz.questions.${current.id}.question`)}
              </h3>

              <div className="grid gap-2.5">
                {current.optionKeys.map((optKey) => (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => pick(optKey)}
                    className="text-left rounded-xl border border-border/70 hover:border-accent hover:bg-accent/5 transition-colors p-4 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {t(`investorQuiz.questions.${current.id}.opts.${optKey}.label`)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {t(`investorQuiz.questions.${current.id}.opts.${optKey}.hint`)}
                        </p>
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
                {t("investorQuiz.result.eyebrow")}
              </p>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {profileLabel}
            </h3>
            <p className="text-muted-foreground mt-2">{t("investorQuiz.result.intro")}</p>

            <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">
                    {rec!.typo.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {t(`investorQuiz.result.rationale.${rec!.rationaleKey}`)}
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
                  // Re-emit chosen typology when user explicitly asks to simulate.
                  if (rec) onResult?.(rec.typo.id);
                  const el = document.getElementById("simulador");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground min-h-[46px]"
              >
                {t("investorQuiz.result.ctaSim")}
              </Button>
              <Button variant="outline" onClick={reset} className="min-h-[46px]">
                <RotateCcw className="mr-2 h-4 w-4" /> {t("investorQuiz.result.ctaReset")}
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
