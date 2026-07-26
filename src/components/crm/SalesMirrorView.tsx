import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, RefreshCw, Search, Users } from "lucide-react";
import { formatBRLCompact, formatBRL2 } from "@/lib/crm";
import { formatArea } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type MirrorRow = Database["public"]["Views"]["crm_sales_mirror"]["Row"];

export type MirrorStatus =
  | "disponivel"
  | "negociacao"
  | "proposta"
  | "reservado"
  | "vendido";

const STATUS_ORDER: MirrorStatus[] = [
  "disponivel",
  "negociacao",
  "proposta",
  "reservado",
  "vendido",
];

const STATUS_LABEL: Record<MirrorStatus, string> = {
  disponivel: "Disponível",
  negociacao: "Em negociação",
  proposta: "Com proposta",
  reservado: "Reservado",
  vendido: "Vendido",
};

const STATUS_DOT: Record<MirrorStatus, string> = {
  disponivel: "bg-mirror-disponivel",
  negociacao: "bg-mirror-negociacao",
  proposta: "bg-mirror-proposta",
  reservado: "bg-mirror-reservado",
  vendido: "bg-mirror-vendido",
};

const STATUS_CARD: Record<MirrorStatus, string> = {
  disponivel: "border-mirror-disponivel/40 bg-card hover:border-mirror-disponivel",
  negociacao: "border-mirror-negociacao/50 bg-mirror-negociacao/5 hover:border-mirror-negociacao",
  proposta: "border-mirror-proposta/50 bg-mirror-proposta/5 hover:border-mirror-proposta",
  reservado: "border-mirror-reservado/50 bg-mirror-reservado/5 hover:border-mirror-reservado",
  vendido: "border-mirror-vendido/50 bg-mirror-vendido/5 opacity-70 hover:opacity-100",
};

const STATUS_STRIP: Record<MirrorStatus, string> = {
  disponivel: "bg-mirror-disponivel",
  negociacao: "bg-mirror-negociacao",
  proposta: "bg-mirror-proposta",
  reservado: "bg-mirror-reservado",
  vendido: "bg-mirror-vendido",
};

function asStatus(v: string | null): MirrorStatus {
  return (STATUS_ORDER as string[]).includes(v ?? "") ? (v as MirrorStatus) : "disponivel";
}

interface DealLink {
  deal_id: string;
  deal_title: string;
  person_name: string;
  stage_label: string;
  stage_kind: string;
}

interface Props {
  onOpenDeal: (id: string) => void;
  onOpenUnits?: () => void;
}

export default function SalesMirrorView({ onOpenDeal, onOpenUnits }: Props) {
  const [rows, setRows] = useState<MirrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<MirrorStatus[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MirrorRow | null>(null);
  const [links, setLinks] = useState<DealLink[] | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("crm_sales_mirror").select("*");
    if (error) {
      toast.error("Não foi possível carregar o espelho de vendas.");
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime — recarrega com debounce quando algo relacionado muda
  useEffect(() => {
    const schedule = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => load(), 800);
    };
    const channel = supabase.channel("crm-sales-mirror");
    for (const table of ["units", "crm_deals", "crm_deal_units", "crm_proposals"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, schedule);
    }
    channel.subscribe();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<MirrorStatus, number> = {
      disponivel: 0,
      negociacao: 0,
      proposta: 0,
      reservado: 0,
      vendido: 0,
    };
    for (const r of rows) c[asStatus(r.mirror_status)] += 1;
    return c;
  }, [rows]);

  const totals = useMemo(() => {
    const vgv = rows.reduce((s, r) => s + (r.price_brl ?? 0), 0);
    const vendido = rows
      .filter((r) => asStatus(r.mirror_status) === "vendido")
      .reduce((s, r) => s + (r.price_brl ?? 0), 0);
    const pct = rows.length ? (counts.vendido / rows.length) * 100 : 0;
    return { vgv, vendido, pct };
  }, [rows, counts.vendido]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statuses.length && !statuses.includes(asStatus(r.mirror_status))) return false;
      if (q && !(r.code ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, statuses, query]);

  const columns = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.col_no) set.add(r.col_no);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [rows]);

  const floors = useMemo(() => {
    const map = new Map<number, Map<string, MirrorRow>>();
    for (const r of filtered) {
      const f = r.floor_no ?? 0;
      if (!map.has(f)) map.set(f, new Map());
      map.get(f)!.set(r.col_no ?? "—", r);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const openUnit = useCallback(async (row: MirrorRow) => {
    setSelected(row);
    setLinks(null);
    if (!row.unit_id) return;
    const { data } = await supabase
      .from("crm_deal_units")
      .select("deal:crm_deals(id, title, person:crm_people(full_name), stage:crm_stages(label, kind))")
      .eq("unit_id", row.unit_id);
    const parsed: DealLink[] = (data ?? [])
      .map((r) => {
        const d = (r as { deal: unknown }).deal as
          | {
              id: string;
              title: string;
              person: { full_name: string } | null;
              stage: { label: string; kind: string } | null;
            }
          | null;
        if (!d) return null;
        return {
          deal_id: d.id,
          deal_title: d.title,
          person_name: d.person?.full_name ?? "—",
          stage_label: d.stage?.label ?? "—",
          stage_kind: d.stage?.kind ?? "aberto",
        };
      })
      .filter(Boolean) as DealLink[];
    setLinks(parsed);
  }, []);

  const exportCsv = useCallback(() => {
    const head = ["Código", "Andar", "Coluna", "Área (m²)", "Preço (R$)", "Status", "Interessados", "Nomes"];
    const lines = [...rows]
      .sort((a, b) => (b.floor_no ?? 0) - (a.floor_no ?? 0) || (a.code ?? "").localeCompare(b.code ?? ""))
      .map((r) =>
        [
          r.code ?? "",
          r.floor_no ?? "",
          r.col_no ?? "",
          r.area_m2 ?? "",
          r.price_brl ?? "",
          STATUS_LABEL[asStatus(r.mirror_status)],
          r.interested_count ?? 0,
          (r.interested_names ?? "").replace(/"/g, "'"),
        ]
          .map((v) => `"${String(v)}"`)
          .join(";"),
      );
    const csv = "\uFEFF" + [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `espelho-de-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const openDeals = (links ?? []).filter((l) => l.stage_kind === "aberto");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Barra superior */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Unidades</p>
                  <p className="font-display text-xl font-semibold tabular-nums">{rows.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">VGV total</p>
                  <p className="font-display text-xl font-semibold tabular-nums">{formatBRLCompact(totals.vgv)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">VGV vendido</p>
                  <p className="font-display text-xl font-semibold tabular-nums">{formatBRLCompact(totals.vendido)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {totals.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => load()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Exportar CSV
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <ToggleGroup
                type="multiple"
                value={statuses}
                onValueChange={(v) => setStatuses(v as MirrorStatus[])}
                className="flex-wrap justify-start"
                aria-label="Filtrar por status"
              >
                {STATUS_ORDER.map((s) => (
                  <ToggleGroupItem key={s} value={s} className="h-9 gap-2 px-3 text-xs">
                    <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[s])} aria-hidden />
                    {STATUS_LABEL[s]}
                    <span className="tabular-nums text-muted-foreground">{counts[s]}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por código"
                  aria-label="Buscar unidade por código"
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade */}
        {floors.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma unidade encontrada com os filtros atuais.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[640px] space-y-2">
              <div
                className="grid items-center gap-2 pl-14"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }}
              >
                {columns.map((c) => (
                  <p key={c} className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Coluna {c}
                  </p>
                ))}
              </div>

              {floors.map(([floor, byCol]) => (
                <div key={floor} className="flex items-stretch gap-2">
                  <div className="flex w-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-semibold tabular-nums">
                    {floor}º
                  </div>
                  <div
                    className="grid flex-1 gap-2"
                    style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }}
                  >
                    {columns.map((col) => {
                      const u = byCol.get(col);
                      if (!u) return <div key={col} aria-hidden className="min-h-[86px] rounded-lg border border-dashed border-border/40" />;
                      const st = asStatus(u.mirror_status);
                      const card = (
                        <button
                          type="button"
                          onClick={() => openUnit(u)}
                          className={cn(
                            "relative flex min-h-[86px] w-full flex-col items-start gap-1 overflow-hidden rounded-lg border p-3 pl-4 text-left transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            STATUS_CARD[st],
                          )}
                        >
                          <span className={cn("absolute inset-y-0 left-0 w-1.5", STATUS_STRIP[st])} aria-hidden />
                          <span className="font-display text-sm font-semibold">{u.code}</span>
                          <span className="text-xs text-muted-foreground">{formatArea(u.area_m2)}</span>
                          <span
                            className={cn(
                              "text-xs font-medium tabular-nums",
                              st === "vendido" && "line-through text-muted-foreground",
                            )}
                          >
                            {formatBRLCompact(u.price_brl ?? 0)}
                          </span>
                          <span className="sr-only">{STATUS_LABEL[st]}</span>
                          {(u.interested_count ?? 0) > 0 && (
                            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                              <Users className="h-3 w-3" aria-hidden />
                              {u.interested_count}
                            </span>
                          )}
                        </button>
                      );
                      const hasTip = (u.interested_count ?? 0) > 0 || u.best_proposal_brl != null;
                      if (!hasTip) return <div key={col}>{card}</div>;
                      return (
                        <Tooltip key={col}>
                          <TooltipTrigger asChild>{card}</TooltipTrigger>
                          <TooltipContent className="max-w-xs space-y-1">
                            {u.interested_names && <p>Em negociação com: {u.interested_names}</p>}
                            {u.best_proposal_brl != null && (
                              <p>Melhor proposta: {formatBRL2(Number(u.best_proposal_brl))}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalhe da unidade */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selected && (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display">Unidade {selected.code}</SheetTitle>
                  <SheetDescription>
                    {selected.floor_no}º andar · coluna {selected.col_no ?? "—"}
                    {selected.block ? ` · bloco ${selected.block}` : ""}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[asStatus(selected.mirror_status)])}
                      aria-hidden
                    />
                    <span className="text-sm font-medium">{STATUS_LABEL[asStatus(selected.mirror_status)]}</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Área privativa</dt>
                      <dd className="font-medium">{formatArea(selected.area_m2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Preço de tabela</dt>
                      <dd className="font-medium tabular-nums">{formatBRL2(selected.price_brl ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Propostas</dt>
                      <dd className="font-medium tabular-nums">{selected.proposals_count ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Melhor proposta</dt>
                      <dd className="font-medium tabular-nums">
                        {selected.best_proposal_brl != null ? formatBRL2(Number(selected.best_proposal_brl)) : "—"}
                      </dd>
                    </div>
                  </dl>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Pessoas interessadas
                    </p>
                    {links === null ? (
                      <Skeleton className="h-16 w-full" />
                    ) : links.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum negócio vinculado a esta unidade até agora.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {links.map((l) => (
                          <li
                            key={l.deal_id}
                            className="rounded-lg border border-border/60 p-3 text-sm"
                          >
                            <p className="font-medium">{l.person_name}</p>
                            <p className="text-xs text-muted-foreground">{l.deal_title}</p>
                            <Badge variant="outline" className="mt-1.5 text-[11px]">
                              {l.stage_label}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {openDeals.length === 1 ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        onOpenDeal(openDeals[0].deal_id);
                        setSelected(null);
                      }}
                    >
                      Abrir negócio
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelected(null);
                        if (onOpenUnits) onOpenUnits();
                        else toast.info("Abra a aba “Unidades à venda” para editar esta unidade.");
                      }}
                    >
                      Ver na aba Unidades
                    </Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
