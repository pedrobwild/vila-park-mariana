import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw, ShieldCheck, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ENTITIES = [
  { value: "all", label: "Todas as entidades" },
  { value: "custom_field_definitions", label: "Campos personalizados (definições)" },
  { value: "custom_field_values", label: "Campos personalizados (valores)" },
  { value: "storage:plantas", label: "Upload de plantas" },
];

const ACTIONS = [
  { value: "all", label: "Todas as ações" },
  { value: "insert", label: "Criação" },
  { value: "update", label: "Alteração" },
  { value: "delete", label: "Exclusão" },
  { value: "upload", label: "Upload" },
];

const ACTION_LABEL: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Exclusão",
  upload: "Upload",
};

const ACTION_COLOR: Record<string, string> = {
  insert: "bg-emerald-100 text-emerald-800 border-emerald-200",
  update: "bg-amber-100 text-amber-800 border-amber-200",
  delete: "bg-rose-100 text-rose-800 border-rose-200",
  upload: "bg-sky-100 text-sky-800 border-sky-200",
};

const PAGE_SIZES = [25, 50, 100];

type SortField = "created_at" | "action" | "entity" | "actor_email";
type SortDir = "asc" | "desc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminAuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramSortField = ((): SortField => {
    const v = searchParams.get("sort");
    return v === "action" || v === "entity" || v === "actor_email" || v === "created_at"
      ? v
      : "created_at";
  })();
  const paramSortDir: SortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const paramPage = Math.max(0, Number(searchParams.get("page") ?? "1") - 1) || 0;
  const paramPageSize = PAGE_SIZES.includes(Number(searchParams.get("size")))
    ? Number(searchParams.get("size"))
    : 25;
  const paramEntity = searchParams.get("entity") ?? "all";
  const paramAction = searchParams.get("action") ?? "all";
  const paramQ = searchParams.get("q") ?? "";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(paramQ);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const entityFilter = paramEntity;
  const actionFilter = paramAction;
  const search = paramQ;
  const sortField = paramSortField;
  const sortDir = paramSortDir;
  const page = paramPage;
  const pageSize = paramPageSize;

  const updateParams = (
    patch: Record<string, string | number | null | undefined>,
    opts: { replace?: boolean } = {}
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "" || v === "all") next.delete(k);
      else next.set(k, String(v));
    }
    setSearchParams(next, { replace: opts.replace });
  };

  // Debounce search input -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) updateParams({ q: trimmed || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    let q = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order(sortField, { ascending: sortDir === "asc" })
      .range(from, to);
    if (entityFilter !== "all") q = q.eq("entity", entityFilter);
    if (actionFilter !== "all") q = q.eq("action", actionFilter);
    if (search) {
      const esc = search.replace(/[%,]/g, " ");
      q = q.or(
        `actor_email.ilike.%${esc}%,entity.ilike.%${esc}%,entity_id.ilike.%${esc}%,action.ilike.%${esc}%`
      );
    }
    const { data, error, count } = await q;
    if (error) {
      console.error(error);
    } else {
      setLogs((data ?? []) as AuditLog[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter, search, sortField, sortDir, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(total, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      updateParams({ dir: sortDir === "asc" ? "desc" : "asc", page: null });
    } else {
      updateParams({ sort: field, dir: "desc", page: null });
    }
  };


  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground text-left"
      >
        {children}
        {sortField === field ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <span className="h-3 w-3 opacity-0" />
        )}
      </button>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="mr-1 h-4 w-4" /> Admin
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <h1 className="font-display text-xl font-semibold">Log de auditoria</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por usuário, entidade, ID ou ação…"
              className="pl-9"
              aria-label="Buscar"
            />
          </div>
          <Select value={entityFilter} onValueChange={(v) => updateParams({ entity: v, page: null })}>
            <SelectTrigger className="w-full md:w-[240px]" aria-label="Filtrar por entidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={(v) => updateParams({ action: v, page: null })}>
            <SelectTrigger className="w-full md:w-[170px]" aria-label="Filtrar por ação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => updateParams({ size: Number(v) === 25 ? null : Number(v), page: null })}>
            <SelectTrigger className="w-full md:w-[120px]" aria-label="Registros por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="created_at" className="w-[170px]">Data/hora</SortHeader>
                <SortHeader field="action" className="w-[110px]">Ação</SortHeader>
                <SortHeader field="entity">Entidade</SortHeader>
                <SortHeader field="actor_email">Usuário</SortHeader>
                <TableHead className="w-[100px] text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ACTION_COLOR[log.action] ?? ""}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.entity}</div>
                    {log.entity_id && (
                      <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">
                        {log.entity_id}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.actor_email ?? (
                      <span className="text-muted-foreground italic">sistema</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(log)}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {total === 0
              ? "Nenhum registro"
              : `Mostrando ${rangeStart}–${rangeEnd} de ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={loading || page === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={loading || page >= totalPages - 1}
            >
              Próxima <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do registro</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> {formatDate(selected.created_at)}</div>
                <div><span className="text-muted-foreground">Ação:</span> {ACTION_LABEL[selected.action] ?? selected.action}</div>
                <div><span className="text-muted-foreground">Entidade:</span> {selected.entity}</div>
                <div className="truncate"><span className="text-muted-foreground">ID:</span> {selected.entity_id ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Usuário:</span> {selected.actor_email ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Metadados</div>
                <pre className="max-h-[400px] overflow-auto rounded bg-muted p-3 text-[11px] font-mono">
{JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
