import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Target, Calculator, Building2, Phone,
  CheckCircle2, ArrowRight, Rocket,
  TrendingUp, BarChart3, MessageCircle,
} from "lucide-react";
import SectionBlock from "@/components/guide/SectionBlock";
import { useGuideDecision } from "@/hooks/useGuideDecision";
import { recommendTypology, calcFinancials, PROPERTY } from "@/data/propertyData";
import { fmt } from "@/data/guide-data";

interface ActionStep {
  icon: any;
  title: string;
  description: string;
  status: "done" | "action" | "pending";
  href?: string;
}

export default function PropertyPlanoAcaoSection() {
  const { investorProfile, hasProfile } = useGuideDecision();

  const recommended = hasProfile ? recommendTypology(investorProfile!.name) : null;
  const recFin = recommended ? calcFinancials(recommended, PROPERTY.avgOccupancy) : null;

  const steps = useMemo((): ActionStep[] => {
    const result: ActionStep[] = [];

    result.push({
      icon: Target,
      title: "Descobrir seu perfil",
      description: hasProfile
        ? `Perfil: ${investorProfile!.name}. Tipologia recomendada: ${recommended?.label} (yield ${recFin?.grossYield}%).`
        : "Complete o diagnóstico para receber uma recomendação de tipologia personalizada.",
      status: hasProfile ? "done" : "action",
      href: "#diagnostico",
    });

    result.push({
      icon: TrendingUp,
      title: "Analisar dados de mercado",
      description: "Consulte o comparativo com dados ao vivo da região — diárias, ocupação e demanda.",
      status: hasProfile ? "done" : "action",
      href: "#market-intel",
    });

    result.push({
      icon: BarChart3,
      title: "Comparar retorno por tipologia",
      description: "Veja yield, payback e receita de cada tipologia lado a lado.",
      status: "action",
      href: "#recomendacao",
    });

    result.push({
      icon: Calculator,
      title: "Simular retorno financeiro",
      description: hasProfile && recommended
        ? `Rode o simulador no ${recommended.label} — yield estimado de ${recFin?.grossYield}% a.a.`
        : "Ajuste ocupação e diária para projetar a receita da tipologia ideal.",
      status: "action",
      href: "#simulador",
    });

    result.push({
      icon: Phone,
      title: "Falar com a equipe e reservar",
      description: "Negocie condições, escolha o andar e garanta sua unidade no Urban Flex Bela Cintra.",
      status: "pending",
      href: "https://wa.me/5591984804821?text=Olá!%20Analisei%20o%20Urban%20Flex%20Bela%20Cintra%20e%20quero%20saber%20sobre%20disponibilidade%20e%20condições.",
    });

    return result;
  }, [hasProfile, investorProfile, recommended, recFin]);

  const completedCount = steps.filter(s => s.status === "done").length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <SectionBlock
      id="plano-acao"
      title="Seu Plano de Ação"
      takeaway="Acompanhe seu progresso rumo à decisão de investimento."
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs font-body text-muted-foreground">
          {completedCount}/{steps.length} etapas
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const cfg = {
            done: { badge: "Concluído", badgeClass: "bg-primary/10 text-primary", iconClass: "text-primary bg-primary/10", dot: <CheckCircle2 size={14} className="text-primary" /> },
            action: { badge: "Próximo passo", badgeClass: "bg-amber-100 text-amber-800", iconClass: "text-amber-600 bg-amber-50", dot: <ArrowRight size={14} className="text-amber-600" /> },
            pending: { badge: "Pendente", badgeClass: "bg-muted text-muted-foreground", iconClass: "text-muted-foreground bg-muted", dot: <span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> },
          }[step.status];

          const isExternal = step.href?.startsWith("http");

          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <a
                href={step.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="block"
              >
                <Card className={`border-border transition-all hover:shadow-md ${
                  step.status === "action" ? "border-amber-300/50" : ""
                }`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-display font-bold text-foreground text-sm">{step.title}</p>
                        <Badge className={`${cfg.badgeClass} font-body text-[10px]`}>{cfg.badge}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-body leading-relaxed">{step.description}</p>
                    </div>
                    <div className="shrink-0 mt-1">{cfg.dot}</div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          );
        })}
      </div>

      {hasProfile && recommended && recFin && (
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-3">
          <Rocket className="text-primary mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-display font-bold text-foreground text-sm mb-1">
              {recommended.label} — yield de {recFin.grossYield}% a.a.
            </p>
            <p className="text-sm text-muted-foreground font-body">
              Com investimento de R$ {fmt(recommended.purchasePrice)}, a projeção é de R$ {fmt(recFin.monthlyRevenue)}/mês com {PROPERTY.avgOccupancy}% de ocupação. Fale com a equipe para garantir condições especiais.
            </p>
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
