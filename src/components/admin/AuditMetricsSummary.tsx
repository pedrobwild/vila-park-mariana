import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIONS = ["market_intel_generate", "market_intel_refresh"];
const SAMPLE = 500;

interface Row {
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function fmtMs(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return v >= 1000
    ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`
    : `${Math.round(v)} ms`;
}

export default function AuditMetricsSummary() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("action, created_at, metadata")
      .in("action", ACTIONS)
      .order("created_at", { ascending: false })
      .limit(SAMPLE);
    if (error) console.error(error);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const m = useMemo(() => {
    const total = rows.length;
    const meta = rows.map((r) => (r.metadata ?? {}) as Record<string, unknown>);
    const ok = meta.filter((x) => x.success === true).length;
    const lat = meta
      .map((x) => Number(x.latency_ms))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const cache = meta.filter((x) => x.origem === "cache").length;
    const reload = meta.filter((x) => x.origem === "recarregado").length;

    const errs = new Map<string, number>();
    for (const x of meta) {
      if (x.success === true) continue;
      const raw = typeof x.error === "string" && x.error.trim() ? x.error.trim() : "Erro não identificado";
      const key = raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
      errs.set(key, (errs.get(key) ?? 0) + 1);
    }

    return {
      total,
      successPct: total > 0 ? (100 * ok) / total : null,
      avg: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
      p95: percentile(lat, 95),
      cache,
      reload,
      errors: [...errs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      lastAt: rows[0]?.created_at ?? null,
    };
  }, [rows]);

  const kpis: { label: string; value: string; hint?: string }[] = [
    {
      label: "Taxa de sucesso",
      value: m.successPct === null ? "—" : `${m.successPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      hint: `${m.total} atualizações analisadas`,
    },
    { label: "Latência média", value: fmtMs(m.avg) },
    { label: "Latência p95", value: fmtMs(m.p95) },
    {
      label: "Origem dos dados",
      value: m.total === 0 ? "—" : `${m.cache} cache · ${m.reload} recarregado`,
    },
  ];

  return (
    <section className="mb-6" aria-labelledby="audit-metrics-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="audit-metrics-title" className="font-display text-base font-semibold">
            Atualizações de inteligência de mercado
          </h2>
          <p className="text-xs text-muted-foreground">
            Resumo das últimas {SAMPLE} atualizações registradas
            {m.lastAt ? ` · última em ${new Date(m.lastAt).toLocaleString("pt-BR")}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xl font-medium tabular-nums">{loading ? "…" : k.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
              {k.hint && !loading && <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-3 border-border/60">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Erros por tipo</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : m.errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {m.total === 0
                ? "Nenhuma atualização registrada ainda."
                : "Nenhuma falha registrada no período analisado."}
            </p>
          ) : (
            <ul className="space-y-2">
              {m.errors.map(([msg, count]) => (
                <li key={msg} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{msg}</span>
                  <Badge variant="outline" className="shrink-0 tabular-nums">
                    {count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
