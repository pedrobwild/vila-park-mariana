import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiProps { value: string; label: string; note?: string; highlight?: boolean; }
function Kpi({ value, label, note, highlight }: KpiProps) {
  return (
    <Card className={cn("card-elevated border-border/60 h-full", highlight && "border-accent/40 bg-accent/5")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn("font-display font-bold text-xl sm:text-2xl leading-tight whitespace-nowrap",
          highlight ? "text-accent" : "text-foreground")}>{value}</p>
        <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
        {note && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{note}</p>}
      </CardContent>
    </Card>
  );
}

interface Row {
  district: string;
  daily: string;
  occupancy: string;
  pricePerSqm: string;
  yieldGross: string;
  verdict: string;
  highlight?: boolean;
}

export default function MarketDataSection() {
  const { t } = useTranslation();
  const rows: Row[] = [
    { district: "Vila Mariana", daily: "R$ 366", occupancy: "80%", pricePerSqm: "R$ 11.500", yieldGross: "~31%", verdict: t("investorGuide.marketData.verdicts.vm"), highlight: true },
    { district: "Consolação", daily: "R$ 390", occupancy: "74%", pricePerSqm: "R$ 10.500", yieldGross: "33,4%", verdict: t("investorGuide.marketData.verdicts.consol") },
    { district: "Pinheiros", daily: "R$ 410", occupancy: "75%", pricePerSqm: "R$ 14.000", yieldGross: "26,7%", verdict: t("investorGuide.marketData.verdicts.pinh") },
    { district: "Itaim Bibi", daily: "R$ 440", occupancy: "73%", pricePerSqm: "R$ 16.000", yieldGross: "24,4%", verdict: t("investorGuide.marketData.verdicts.itaim") },
    { district: "Moema", daily: "R$ 380", occupancy: "70%", pricePerSqm: "R$ 14.500", yieldGross: "22,3%", verdict: t("investorGuide.marketData.verdicts.moema") },
    { district: "República", daily: "R$ 300", occupancy: "67%", pricePerSqm: "R$ 9.000", yieldGross: "29,8%", verdict: t("investorGuide.marketData.verdicts.rep") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{t("investorGuide.marketData.seedBadge")}</Badge>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi highlight value="R$ 320–420" label={t("investorGuide.marketData.kpi.daily.label")} note={t("investorGuide.marketData.kpi.daily.note")} />
        <Kpi value="~80%" label={t("investorGuide.marketData.kpi.occ.label")} note={t("investorGuide.marketData.kpi.occ.note")} />
        <Kpi value="1.800+" label={t("investorGuide.marketData.kpi.listings.label")} note={t("investorGuide.marketData.kpi.listings.note")} />
        <Kpi value="R$ 11.500/m²" label={t("investorGuide.marketData.kpi.price.label")} note={t("investorGuide.marketData.kpi.price.note")} />
      </div>

      <Card className="card-elevated border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.district")}</th>
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.daily")}</th>
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.occ")}</th>
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.price")}</th>
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.yield")}</th>
                <th className="p-3 font-semibold">{t("investorGuide.marketData.cols.verdict")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.district} className={cn("border-t border-border/40", r.highlight && "bg-accent/5")}>
                  <td className="p-3 font-semibold text-foreground">
                    {r.district}
                    {r.highlight && <Badge className="ml-2 bg-accent/10 text-accent border-accent/20 hover:bg-accent/10">★</Badge>}
                  </td>
                  <td className="p-3 tabular-nums">{r.daily}</td>
                  <td className="p-3 tabular-nums">{r.occupancy}</td>
                  <td className="p-3 tabular-nums">{r.pricePerSqm}</td>
                  <td className="p-3 tabular-nums font-medium">{r.yieldGross}</td>
                  <td className="p-3 text-muted-foreground">{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="card-elevated border-accent/20 bg-accent/5">
        <CardContent className="p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">{t("investorGuide.marketData.formulaTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t("investorGuide.marketData.formulaText")}</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">{t("investorGuide.marketData.source")}</p>
    </div>
  );
}
