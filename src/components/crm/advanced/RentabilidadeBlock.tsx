import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRLCompact } from "@/lib/crm";
import { computePropostasVpl, formatPct, totalNpv, VERDICT_LABEL, type AdvancedData } from "@/lib/crmAdvanced";

interface Props {
  data: AdvancedData["rentabilidade"];
}

const MAX_LINHAS = 25;

export default function RentabilidadeBlock({ data }: Props) {
  const rows = useMemo(
    () => computePropostasVpl(data.propostas, data.parametros),
    [data.propostas, data.parametros],
  );
  const npvTotal = useMemo(() => totalNpv(rows), [rows]);
  const media = useMemo(() => {
    if (rows.length === 0) return { real: 0, tabela: 0 };
    const real = rows.reduce((a, r) => a + r.vpl.realDiscount, 0) / rows.length;
    const tabela = rows.reduce((a, r) => a + r.vpl.listDiscount, 0) / rows.length;
    return { real: real * 100, tabela: tabela * 100 };
  }, [rows]);

  const ordenadas = useMemo(() => [...rows].sort((a, b) => b.gapPp - a.gapPp), [rows]);
  const visiveis = ordenadas.slice(0, MAX_LINHAS);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Rentabilidade das propostas</CardTitle>
        <CardDescription>
          Cada proposta trazida a valor presente pela taxa de oportunidade de{" "}
          {formatPct(data.parametros.vpl_monthly_rate * 100, 2)} ao mês
          {data.parametros.vpl_correct_by_incc
            ? `, com correção de ${formatPct(data.parametros.proposal_incc_monthly * 100, 2)} ao mês nas parcelas futuras`
            : ", sem correção das parcelas futuras"}
          . O desconto real revela quanto o alongamento do fluxo custa além do desconto de tabela.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">VGV de tabela</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {formatBRLCompact(data.impacto.vgv_tabela_brl)}
            </p>
            <p className="text-xs text-muted-foreground">{rows.length} proposta(s) no período</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">VGV proposto</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {formatBRLCompact(data.impacto.vgv_proposto_brl)}
            </p>
            <p className="text-xs text-muted-foreground">
              −{formatBRLCompact(data.impacto.desconto_nominal_brl)} de desconto nominal
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Valor presente</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatBRLCompact(npvTotal)}</p>
            <p className="text-xs text-muted-foreground">soma dos fluxos trazidos a hoje</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Desconto real médio</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatPct(media.real)}</p>
            <p className="text-xs text-muted-foreground">tabela: {formatPct(media.tabela)}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma proposta registrada com os filtros atuais.
          </p>
        ) : (
          <>
            <div className="-mx-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Proposta</TableHead>
                    <TableHead className="text-right">Tabela</TableHead>
                    <TableHead className="text-right">Proposto</TableHead>
                    <TableHead className="text-right">Valor presente</TableHead>
                    <TableHead className="text-right">Desc. tabela</TableHead>
                    <TableHead className="text-right">Desc. real</TableHead>
                    <TableHead className="pr-6 text-right">Leitura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6">
                        <p className="text-sm font-medium">Unidade {p.unit_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {[p.titulo_negocio, p.corretor].filter(Boolean).join(" · ") || "Sem corretor"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRLCompact(p.list_price_brl ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRLCompact(p.final_price_brl ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRLCompact(p.vpl.npvBrl)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPct(p.vpl.listDiscount * 100)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPct(p.vpl.realDiscount * 100)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge
                          variant="outline"
                          className={
                            p.vpl.verdict === "alongado"
                              ? "border-destructive/40 text-destructive"
                              : p.vpl.verdict === "antecipado"
                                ? "border-mirror-vendido/40 text-mirror-vendido"
                                : ""
                          }
                        >
                          {VERDICT_LABEL[p.vpl.verdict]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {ordenadas.length > MAX_LINHAS && (
              <p className="text-xs text-muted-foreground">
                Exibindo as {MAX_LINHAS} propostas com maior diferença entre desconto real e de tabela, de{" "}
                {ordenadas.length} no período.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
