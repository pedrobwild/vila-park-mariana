import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  daysSince,
  formatBRLCompact,
  stageBadgeClass,
  type CrmStageRow,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deals: DealFull[];
  stages: CrmStageRow[];
  onOpenDeal: (id: string) => void;
}

type SortKey = "value" | "updated";
type SortDir = "asc" | "desc";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function ListView({ deals, stages, onOpenDeal }: Props) {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = deals.filter((d) => {
      if (stageFilter !== "all" && d.stage_id !== stageFilter) return false;
      if (!term) return true;
      return (
        d.title.toLowerCase().includes(term) ||
        d.person.full_name.toLowerCase().includes(term)
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "value") {
        return (Number(a.value_brl || 0) - Number(b.value_brl || 0)) * dir;
      }
      return (
        (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir
      );
    });
    return list;
  }, [deals, q, stageFilter, sortKey, sortDir]);

  const total = filtered.reduce((s, d) => s + Number(d.value_brl || 0), 0);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por pessoa ou título"
            className="pl-8 h-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="Todas as etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Negócio</th>
              <th className="px-3 py-2 font-medium">Etapa</th>
              <th className="px-3 py-2 font-medium">Unidades</th>
              <th className="px-3 py-2 font-medium text-right">
                <button
                  onClick={() => toggleSort("value")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Valor <SortIcon k="value" />
                </button>
              </th>
              <th className="px-3 py-2 font-medium text-right">Dias na etapa</th>
              <th className="px-3 py-2 font-medium">
                <button
                  onClick={() => toggleSort("updated")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Atualizado em <SortIcon k="updated" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-xs text-muted-foreground">
                  Nenhum negócio encontrado.
                </td>
              </tr>
            )}
            {filtered.map((d) => (
              <tr
                key={d.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpenDeal(d.id)}
              >
                <td className="px-3 py-2.5">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.person.full_name}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${stageBadgeClass(d.stage.kind)}`}
                  >
                    {d.stage.label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {d.deal_units.slice(0, 4).map((du) => (
                      <span
                        key={du.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums ${
                          du.is_primary
                            ? "border-accent/60 text-accent bg-accent/5 font-medium"
                            : "border-border/60 text-muted-foreground"
                        }`}
                      >
                        {du.unit?.code ?? "—"}
                      </span>
                    ))}
                    {d.deal_units.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{d.deal_units.length - 4}
                      </span>
                    )}
                    {d.deal_units.length === 0 && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {BRL(Number(d.value_brl || 0))}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {daysSince(d.stage_changed_at)}d
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {new Date(d.updated_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <td className="px-3 py-2" colSpan={3}>
                  {filtered.length} negócio{filtered.length > 1 ? "s" : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                  {formatBRLCompact(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
