import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRLCompact } from "@/lib/crm";
import { formatNum, formatPct, type CorretorRow, type DrillItem } from "@/lib/crmAdvanced";

interface Props {
  data: CorretorRow[];
  onDrill: (title: string, description: string, items: DrillItem[], total: number) => void;
}

export default function ProdutividadeBlock({ data, onDrill }: Props) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Produtividade por corretor</CardTitle>
        <CardDescription>
          Conversão, ticket médio, tempo de primeira resposta e cumprimento de SLA das tarefas. Clique em
          um corretor para ver a carteira dele no período.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {data.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-muted-foreground">
            Nenhum corretor ativo cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Corretor</TableHead>
                  <TableHead className="text-right">Neg.</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">VGV ganho</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead className="text-right">1ª resposta</TableHead>
                  <TableHead className="pr-6 text-right">Tarefas / SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow
                    key={c.broker_id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver negócios de ${c.corretor}`}
                    onClick={() => onDrill(c.corretor, "Carteira no período", c.itens, c.itens_total)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onDrill(c.corretor, "Carteira no período", c.itens, c.itens_total);
                      }
                    }}
                  >
                    <TableCell className="pl-6">
                      <p className="text-sm font-medium">{c.corretor}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.equipe ?? "Sem equipe"}
                        {c.in_rotation ? " · na roleta" : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.deals_total}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.deals_ganhos}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(c.taxa_conversao_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRLCompact(c.vgv_ganho_brl)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRLCompact(c.ticket_medio_brl)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.primeira_resposta_horas === null ? "—" : `${formatNum(c.primeira_resposta_horas)} h`}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.tarefas_atrasadas > 0 && (
                          <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive">
                            {c.tarefas_atrasadas} atrasada(s)
                          </Badge>
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {c.tarefas_abertas} aberta(s) · SLA {formatPct(c.sla_cumprido_pct)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
