import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBRLCompact } from "@/lib/crm";
import { formatNum, formatPct, type AbsorcaoGrupo, type AdvancedData, type DrillItem } from "@/lib/crmAdvanced";

interface Props {
  data: AdvancedData["absorcao"];
  onDrill: (title: string, description: string, items: DrillItem[], total: number) => void;
}

function GrupoTable({
  grupos,
  onDrill,
  tipo,
}: {
  grupos: AbsorcaoGrupo[];
  onDrill: Props["onDrill"];
  tipo: string;
}) {
  if (grupos.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem unidades para este agrupamento.</p>;
  }
  return (
    <div className="-mx-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">{tipo}</TableHead>
            <TableHead className="text-right">Unid.</TableHead>
            <TableHead className="text-right">Vendidas</TableHead>
            <TableHead className="text-right">Disponíveis</TableHead>
            <TableHead className="text-right">VSO</TableHead>
            <TableHead className="text-right">Preço médio</TableHead>
            <TableHead className="pr-6 text-right">Interesse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((g) => (
            <TableRow
              key={g.rotulo}
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`Ver unidades de ${g.rotulo}`}
              onClick={() => onDrill(g.rotulo, "Unidades do agrupamento", g.itens, g.itens_total)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onDrill(g.rotulo, "Unidades do agrupamento", g.itens, g.itens_total);
                }
              }}
            >
              <TableCell className="pl-6 text-sm font-medium">{g.rotulo}</TableCell>
              <TableCell className="text-right tabular-nums">{g.total}</TableCell>
              <TableCell className="text-right tabular-nums">{g.vendidas}</TableCell>
              <TableCell className="text-right tabular-nums">{g.disponiveis}</TableCell>
              <TableCell className="text-right tabular-nums">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted/60" aria-hidden>
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, g.vso_pct ?? 0)}%` }} />
                  </div>
                  <span>{formatPct(g.vso_pct)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatBRLCompact(g.preco_medio_brl)}</TableCell>
              <TableCell className="pr-6 text-right tabular-nums">
                {g.interessados} · {g.propostas} prop.
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AbsorcaoBlock({ data, onDrill }: Props) {
  const [tab, setTab] = useState("tipologia");
  const r = data.resumo;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Absorção de estoque (VSO)</CardTitle>
        <CardDescription>
          Ritmo de vendas sobre a oferta disponível e desempenho por tipologia, andar e face. Clique em
          uma linha para ver as unidades.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">VSO do período</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatPct(r.vso_pct)}</p>
            <p className="text-xs text-muted-foreground">
              {r.vendidas_periodo} vendida(s) sobre {r.disponiveis + r.vendidas_periodo} ofertada(s)
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Velocidade de vendas</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatNum(r.vendas_media_mensal, 2)}</p>
            <p className="text-xs text-muted-foreground">unidades por mês no período</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Meses de estoque</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatNum(r.meses_de_estoque)}</p>
            <p className="text-xs text-muted-foreground">{r.disponiveis} unidade(s) disponível(is)</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">VGV vendido</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatBRLCompact(r.vgv_vendido_brl)}</p>
            <p className="text-xs text-muted-foreground">de {formatBRLCompact(r.vgv_total_brl)} no estoque</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="tipologia">Por tipologia</TabsTrigger>
            <TabsTrigger value="andar">Por andar</TabsTrigger>
            <TabsTrigger value="face">Por face</TabsTrigger>
          </TabsList>
          <TabsContent value="tipologia" className="mt-3">
            <GrupoTable grupos={data.por_tipologia} onDrill={onDrill} tipo="Tipologia" />
          </TabsContent>
          <TabsContent value="andar" className="mt-3">
            <GrupoTable grupos={data.por_andar} onDrill={onDrill} tipo="Andar" />
          </TabsContent>
          <TabsContent value="face" className="mt-3">
            <GrupoTable grupos={data.por_face} onDrill={onDrill} tipo="Face" />
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { titulo: "Unidades mais procuradas", lista: data.ranking.mais_procuradas },
            { titulo: "Disponíveis com menor procura", lista: data.ranking.menos_procuradas },
          ].map((bloco) => (
            <div key={bloco.titulo} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{bloco.titulo}</p>
              {bloco.lista.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sem unidades para exibir.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {bloco.lista.map((u) => (
                    <li key={u.unit_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="font-medium">{u.code}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {u.unit_status}
                        </Badge>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {u.interested_count} interess. · {u.proposals_count} prop.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
