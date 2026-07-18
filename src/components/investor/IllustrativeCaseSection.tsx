import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileSignature, HardHat, KeyRound, Sofa, Camera, TrendingUp, CheckCircle2 } from "lucide-react";

const TIMELINE = [
  { icon: FileSignature, key: "reserve" },
  { icon: HardHat, key: "obra" },
  { icon: KeyRound, key: "keys" },
  { icon: Sofa, key: "furnish" },
  { icon: Camera, key: "launch" },
  { icon: TrendingUp, key: "rampup" },
  { icon: CheckCircle2, key: "stable" },
];

export default function IllustrativeCaseSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-amber-500/40 text-amber-700 dark:text-amber-400">
          {t("investorGuide.case.badge")}
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("investorGuide.case.kpi.location")}</p>
            <p className="mt-1 font-display font-bold text-xl text-foreground">Vila Mariana</p>
          </CardContent>
        </Card>
        <Card className="card-elevated border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("investorGuide.case.kpi.area")}</p>
            <p className="mt-1 font-display font-bold text-xl text-foreground">25 m²</p>
          </CardContent>
        </Card>
        <Card className="card-elevated border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("investorGuide.case.kpi.revenue")}</p>
            <p className="mt-1 font-display font-bold text-xl text-accent whitespace-nowrap">R$ 6.500–8.000/mês</p>
          </CardContent>
        </Card>
        <Card className="card-elevated border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("investorGuide.case.kpi.yield")}</p>
            <p className="mt-1 font-display font-bold text-xl text-accent">~20–24%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated border-border/60">
        <CardContent className="p-5 md:p-6 space-y-3">
          <p className="font-semibold text-foreground">{t("investorGuide.case.composition.title")}</p>
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border/40 p-3">
              <p className="text-muted-foreground">{t("investorGuide.case.composition.unit")}</p>
              <p className="font-semibold text-foreground tabular-nums mt-1">R$ 550.000</p>
            </div>
            <div className="rounded-lg border border-border/40 p-3">
              <p className="text-muted-foreground">{t("investorGuide.case.composition.furnish")}</p>
              <p className="font-semibold text-foreground tabular-nums mt-1">R$ 55.000</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-muted-foreground">{t("investorGuide.case.composition.total")}</p>
              <p className="font-semibold text-accent tabular-nums mt-1">R$ 605.000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated border-border/60">
        <CardContent className="p-5 md:p-6">
          <p className="font-semibold text-foreground mb-4">{t("investorGuide.case.timeline.title")}</p>
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {TIMELINE.map((step, i) => (
              <li key={step.key} className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("investorGuide.case.timeline.step", { n: i + 1 })}</p>
                  <p className="text-sm font-medium text-foreground">{t(`investorGuide.case.timeline.items.${step.key}`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">{t("investorGuide.case.disclaimer")}</p>
      </div>
    </div>
  );
}
