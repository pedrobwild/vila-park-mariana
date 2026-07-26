import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PeopleManager from "./PeopleManager";
import { SOURCE_LABEL, type CrmPerson, type CrmSource } from "@/lib/crm";
import { evaluateCompleteness } from "@/lib/person";
import type { Unit } from "@/lib/units";
import type { DealFull } from "./CrmSection";

interface Props {
  people: CrmPerson[];
  deals: DealFull[];
  units: Unit[];
  onReload: () => Promise<void>;
  onOpenDeal: (id: string) => void;
  onNewDealForPerson: (personId: string) => void;
  autoOpenNew?: boolean;
  onAutoOpenNewHandled?: () => void;
}

function Kpi({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="font-display text-2xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1.5 text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function LeadsSection(props: Props) {
  const { people, deals } = props;

  const stats = useMemo(() => {
    const total = people.length;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30 = people.filter((p) => {
      const t = p.created_at ? new Date(p.created_at).getTime() : NaN;
      return Number.isFinite(t) && t >= cutoff;
    }).length;

    const withDeal = new Set(deals.map((d) => d.person_id));
    const noDeal = people.filter((p) => !withDeal.has(p.id)).length;
    const incomplete = people.filter((p) => !evaluateCompleteness(p).complete).length;

    const bySource = new Map<CrmSource, number>();
    for (const p of people) {
      const s = (p.source ?? "outro") as CrmSource;
      bySource.set(s, (bySource.get(s) ?? 0) + 1);
    }
    const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
    const top = sources[0];

    return { total, last30, noDeal, incomplete, sources, top };
  }, [people, deals]);

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          value={String(stats.total)}
          label="Leads na base"
          hint={`+${stats.last30} nos últimos 30 dias`}
        />
        <Kpi value={String(stats.noDeal)} label="Sem negócio aberto" hint="oportunidade de contato" />
        <Kpi
          value={String(stats.incomplete)}
          label="Cadastro incompleto"
          hint="faltam dados para proposta"
        />
        <Kpi
          value={stats.top ? SOURCE_LABEL[stats.top[0]] ?? "—" : "—"}
          label="Principal origem"
          hint={stats.top ? `${pct(stats.top[1])}% da base` : "sem dados"}
        />
      </div>

      {stats.sources.length > 0 && (
        <section className="rounded-lg border border-border/60 p-4">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Distribuição por origem
          </h2>
          <ul className="mt-3 space-y-2.5">
            {stats.sources.map(([source, count]) => (
              <li key={source} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {SOURCE_LABEL[source] ?? source}
                </span>
                <span className="h-1.5 flex-1 rounded-full bg-muted">
                  <span
                    className="block h-1.5 rounded-full bg-primary/70"
                    style={{ width: `${pct(count)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {count} · {pct(count)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PeopleManager {...props} />
    </div>
  );
}
