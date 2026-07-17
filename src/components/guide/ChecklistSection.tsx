import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Share2, PartyPopper } from "lucide-react";
import { CHECKLIST_ITEMS, SCORE_TIERS } from "@/data/guide-data";
import { useToast } from "@/hooks/use-toast";
import SectionBlock from "./SectionBlock";

const TIER_DESCRIPTIONS: Record<string, string> = {
  Iniciante: "Você precisa amadurecer o projeto antes de investir.",
  "Em progresso": "Bom começo. Resolva os itens pendentes para reduzir riscos.",
  "Quase pronto": "Quase lá! Poucos itens faltam para investir com segurança.",
  Pronto: "Seu projeto está maduro. Hora de executar.",
};

function getTierColor(score: number) {
  if (score <= 3) return "bg-red-400";
  if (score <= 6) return "bg-amber-400";
  if (score <= 8) return "bg-blue-400";
  return "bg-emerald-400";
}

function getTierBadgeColor(score: number) {
  if (score <= 3) return "bg-red-400 text-white";
  if (score <= 6) return "bg-amber-400 text-white";
  if (score <= 8) return "bg-blue-400 text-white";
  return "bg-emerald-400 text-white";
}

// Mini confetti component
function Confetti() {
  const particles = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 120,
    y: -(Math.random() * 80 + 40),
    rotate: Math.random() * 360,
    color: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"][i],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5, rotate: p.rotate }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function ChecklistSection() {
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevScoreRef = useRef(0);
  const { toast } = useToast();

  const total = CHECKLIST_ITEMS.length;

  const toggle = useCallback((i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      const newScore = next.filter(Boolean).length;

      // Flash effect on check
      if (next[i]) {
        setFlashIndex(i);
        setTimeout(() => setFlashIndex(null), 400);
      }

      // Confetti on 100%
      if (newScore === total && prevScoreRef.current < total) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1000);
      }
      prevScoreRef.current = newScore;

      return next;
    });
  }, [total]);

  const score = checked.filter(Boolean).length;
  const tier = SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? SCORE_TIERS[0];
  const tierDesc = TIER_DESCRIPTIONS[tier.label] ?? tier.desc;
  const tierColor = getTierColor(score);
  const tierBadgeColor = getTierBadgeColor(score);

  const handleShare = () => {
    const text = `Completei ${score}/${total} no Checklist do Investidor Bwild — nível ${tier.label}! 🏗️`;
    navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado!", description: "Cole onde quiser compartilhar." });
  };

  return (
    <SectionBlock id="checklist-final" title="Checklist: você está pronto para investir?" takeaway="Avalie sua preparação antes de investir.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {CHECKLIST_ITEMS.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              className={`border-border cursor-pointer transition-all duration-300 ${
                checked[i] ? "bg-primary/5 border-primary/30" : ""
              } ${flashIndex === i ? "!bg-emerald-500/10" : ""}`}
              onClick={() => toggle(i)}
            >
              <CardContent className="p-4 flex items-center gap-3 min-h-[48px]">
                <Checkbox checked={checked[i]} onCheckedChange={() => toggle(i)} />
                <span className={`text-sm font-body flex-1 transition-colors duration-300 ${
                  checked[i] ? "text-emerald-600 font-medium" : "text-muted-foreground"
                }`}>
                  {item}
                </span>
                <AnimatePresence>
                  {checked[i] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check size={16} className="text-emerald-500 flex-shrink-0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border relative">
        {showConfetti && <Confetti />}
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground font-body mb-2">Sua pontuação</p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl font-display font-bold text-foreground">{score}</span>
            <span className="text-lg text-muted-foreground font-body">/ {total}</span>
            <Button variant="ghost" size="sm" onClick={handleShare} className="ml-2 min-h-[44px] min-w-[44px]">
              <Share2 size={16} />
            </Button>
          </div>

          {/* Tier badge with AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tier.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Badge className={`${tierBadgeColor} font-body text-base font-bold px-4 py-1.5`}>{tier.label}</Badge>
            </motion.div>
          </AnimatePresence>

          <p className="text-sm text-muted-foreground font-body mt-3 max-w-md mx-auto">{tierDesc}</p>

          {/* Segmented progress bar */}
          <div className="flex gap-0.5 mt-4">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-sm transition-all duration-500 ${
                  i < score ? tierColor : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* 100% CTA */}
          <AnimatePresence>
            {score === total && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <PartyPopper size={20} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground font-body">
                    Você completou o checklist! Seu projeto parece pronto para o próximo passo.
                  </p>
                </div>
                <Button size="sm" className="bg-primary text-primary-foreground font-body min-h-[44px]" asChild>
                  <a href="#cta-final">Solicitar diagnóstico gratuito</a>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </SectionBlock>
  );
}
