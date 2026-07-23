import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (entityFilter !== "all") q = q.eq("entity", entityFilter);
    const { data, error } = await q;
    if (error) {
      console.error(error);
    } else {
      setLogs((data ?? []) as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter]);

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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Filtrar por entidade:</span>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[280px]">
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
          <span className="ml-auto text-xs text-muted-foreground">
            {logs.length} {logs.length === 1 ? "registro" : "registros"} (últimos 200)
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Data/hora</TableHead>
                <TableHead className="w-[110px]">Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Usuário</TableHead>
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
              {logs.map((log) => (
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
