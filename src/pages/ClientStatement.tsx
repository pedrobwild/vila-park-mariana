import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  buildStatement,
  formatBRL,
  formatDateBR,
  type Contract,
  type Installment,
} from "@/lib/contractStatement";

interface ContractRow extends Contract {
  unit?: { code: string; block: string; area_m2: number } | null;
}

const KIND_LABEL: Record<string, string> = {
  sinal: "Sinal",
  mensal: "Mensal",
  intermediaria: "Intermediária",
  chaves: "Chaves",
};

export default function ClientStatement() {
  const { session, isAdmin, loading: authLoading } = useIsAdmin();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [baseDate, setBaseDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contracts")
        .select("*, unit:units(code, block, area_m2)")
        .order("contract_number");
      const rows = (data ?? []) as unknown as ContractRow[];
      setContracts(rows);
      if (rows.length && !selectedId) setSelectedId(rows[0].id);
      setLoading(false);
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data } = await supabase
        .from("contract_installments")
        .select("*")
        .eq("contract_id", selectedId)
        .order("due_date");
      setInstallments((data ?? []) as unknown as Installment[]);
    })();
  }, [selectedId]);

  const contract = useMemo(
    () => contracts.find((c) => c.id === selectedId) ?? null,
    [contracts, selectedId],
  );

  const statement = useMemo(() => {
    if (!contract) return null;
    return buildStatement(contract, installments, baseDate);
  }, [contract, installments, baseDate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header (oculto na impressão) */}
      <header className="print:hidden sticky top-0 z-40 glass-nav border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Admin
              </Button>
            </Link>
            <span className="font-display text-lg font-bold">Extrato do cliente</span>
          </div>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="h-9"
            disabled={!statement}
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir / salvar PDF
          </Button>
        </div>
      </header>

      {/* Controles (ocultos na impressão) */}
      <section className="print:hidden max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="grid gap-4 md:grid-cols-[1fr,220px] items-end">
          <div>
            <Label htmlFor="contract-select" className="text-xs uppercase tracking-wider text-muted-foreground">
              Contrato
            </Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="contract-select" className="mt-1">
                <SelectValue placeholder={loading ? "Carregando…" : "Selecione um contrato"} />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.contract_number} · {c.client_name} · Unidade {c.unit?.code ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="base-date" className="text-xs uppercase tracking-wider text-muted-foreground">
              Data base
            </Label>
            <Input
              id="base-date"
              type="date"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      {/* Documento */}
      {contract && statement ? (
        <article className="max-w-6xl mx-auto px-4 md:px-6 pb-16 print:px-0 print:pb-0">
          <div className="border border-border rounded-lg print:border-0 bg-card print:bg-white p-6 md:p-10 shadow-sm print:shadow-none tabular-nums">
            <StatementHeader baseDate={baseDate} />
            <IdentificationBlock contract={contract} summary={statement.summary} />
            <InstallmentsTable statement={statement} />
            <FooterNotes checks={statement.checks} contract={contract} />
          </div>
        </article>
      ) : (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 text-center text-sm text-muted-foreground">
          {loading ? "Carregando contratos…" : "Nenhum contrato disponível."}
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: white !important; }
          .glass-nav, header.print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function StatementHeader({ baseDate }: { baseDate: string }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border pb-4 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">
          EXTRATO DO CLIENTE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Matere Bittar Incorporações — <span className="italic">DEMONSTRAÇÃO</span>
        </p>
        <p className="text-sm font-medium">Vila Park Vila Mariana</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Data base</p>
        <p className="text-base font-semibold">{formatDateBR(baseDate)}</p>
      </div>
    </header>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function IdentificationBlock({
  contract,
  summary,
}: {
  contract: ContractRow;
  summary: ReturnType<typeof buildStatement>["summary"];
}) {
  const bloco = contract.unit
    ? `${contract.unit.block} · ${contract.unit.area_m2} m²`
    : "—";
  return (
    <section className="grid gap-6 md:grid-cols-2 mb-8">
      <div className="space-y-3">
        <Field label="Cliente" value={contract.client_name} />
        <Field label="Bloco" value={bloco} />
        <Field label="Unidade" value={contract.unit?.code ?? "—"} />
        <Field label="Contrato" value={contract.contract_number} />
        <Field label="Data do contrato" value={formatDateBR(contract.contract_date)} />
      </div>
      <div className="space-y-3 md:border-l md:border-border md:pl-6">
        <Field label="Valor original do contrato" value={formatBRL(summary.originalValue)} />
        <Field label="Valor contrato" value={formatBRL(summary.contractValue)} />
        <Field
          label="Total pago"
          value={<span className="text-emerald-700">{formatBRL(summary.totalPago)}</span>}
        />
        <Field
          label="Valor quitação"
          value={<span className="text-accent">{formatBRL(summary.valorQuitacao)}</span>}
        />
      </div>
    </section>
  );
}

function InstallmentsTable({
  statement,
}: {
  statement: ReturnType<typeof buildStatement>;
}) {
  const { rows, summary } = statement;
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">
        Parcelas contratuais
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th className="py-2 pr-2 font-semibold">Parcela</th>
              <th className="py-2 pr-2 font-semibold">Sequência</th>
              <th className="py-2 pr-2 font-semibold">Vencimento</th>
              <th className="py-2 pr-2 font-semibold">Pagamento</th>
              <th className="py-2 pr-2 font-semibold text-right">Contratual</th>
              <th className="py-2 pr-2 font-semibold text-right">Multa</th>
              <th className="py-2 pr-2 font-semibold text-right">Juros mora</th>
              <th className="py-2 pr-2 font-semibold text-right">Desconto</th>
              <th className="py-2 pr-2 font-semibold text-right">Tx. adm.</th>
              <th className="py-2 pr-2 font-semibold text-right">Tx. seguro</th>
              <th className="py-2 pr-2 font-semibold text-right">Corrigido</th>
              <th className="py-2 pl-2 font-semibold text-right">Pago</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const paid = !!r.paid_date && Number(r.paid_value) > 0;
              return (
                <tr key={r.id} className="border-b border-border/50 align-top">
                  <td className="py-1.5 pr-2 font-mono text-[11px]">{r.id.slice(0, 8)}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{r.seq_label}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateBR(r.due_date)}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateBR(r.paid_date)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatBRL(Number(r.contractual_value))}</td>
                  <td className="py-1.5 pr-2 text-right">{Number(r.fine_value) ? formatBRL(Number(r.fine_value)) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right">{Number(r.interest_value) ? formatBRL(Number(r.interest_value)) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right">{Number(r.discount_value) ? formatBRL(Number(r.discount_value)) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right">{Number(r.admin_fee) ? formatBRL(Number(r.admin_fee)) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right">{Number(r.insurance_fee) ? formatBRL(Number(r.insurance_fee)) : "—"}</td>
                  <td className="py-1.5 pr-2 text-right">{formatBRL(r.correctedNow)}</td>
                  <td className="py-1.5 pl-2 text-right">
                    {paid ? (
                      <span className="text-emerald-700 font-medium">{formatBRL(Number(r.paid_value))}</span>
                    ) : (
                      <span className="text-muted-foreground">Em aberto</span>
                    )}
                    <span className="block text-[10px] text-muted-foreground">
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2 pr-2" colSpan={4}>TOTAL</td>
              <td className="py-2 pr-2 text-right">{formatBRL(summary.totalContractual)}</td>
              <td className="py-2 pr-2 text-right">{formatBRL(summary.totalMulta)}</td>
              <td className="py-2 pr-2 text-right">{formatBRL(summary.totalJuros)}</td>
              <td className="py-2 pr-2 text-right">{formatBRL(summary.totalDesconto)}</td>
              <td className="py-2 pr-2 text-right" colSpan={2}>{formatBRL(summary.totalTaxas)}</td>
              <td className="py-2 pr-2 text-right">{formatBRL(summary.totalCorrigido)}</td>
              <td className="py-2 pl-2 text-right">{formatBRL(summary.totalPago)}</td>
            </tr>
            <tr className="font-bold text-sm bg-muted/40 print:bg-transparent">
              <td className="py-2 pr-2" colSpan={10}>TOTAL GERAL</td>
              <td className="py-2 pr-2 text-right text-accent">{formatBRL(summary.totalCorrigido)}</td>
              <td className="py-2 pl-2 text-right text-emerald-700">{formatBRL(summary.totalPago)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function FooterNotes({
  checks,
  contract,
}: {
  checks: ReturnType<typeof buildStatement>["checks"];
  contract: Contract;
}) {
  const allOk = checks.sumEqualsContract && checks.paidHavePaidDate;
  return (
    <footer className="pt-4 border-t border-border space-y-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        {allOk ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        )}
        <span>
          Conferências: soma das parcelas = valor do contrato{" "}
          <strong className={checks.sumEqualsContract ? "text-emerald-700" : "text-amber-700"}>
            {checks.sumEqualsContract ? "OK" : "DIVERGE"}
          </strong>{" "}
          · parcelas pagas com data{" "}
          <strong className={checks.paidHavePaidDate ? "text-emerald-700" : "text-amber-700"}>
            {checks.paidHavePaidDate ? "OK" : "PENDENTE"}
          </strong>
          .
        </span>
      </div>
      <ol className="list-[lower-alpha] pl-5 space-y-1 leading-relaxed">
        <li>Este documento é meramente informativo e não constitui prova de pagamento ou quitação.</li>
        <li>Fornecido via sistema a pedido do cliente.</li>
        <li>Pagamentos por boleto são processados em até 5 dias úteis.</li>
        <li>
          Índice de correção aplicado: <strong>{contract.index_label}</strong> (parametrizado no contrato,{" "}
          {(Number(contract.monthly_index_rate) * 100).toFixed(4)}% a.m.). Multa{" "}
          {(Number(contract.late_fine_rate) * 100).toFixed(0)}% e mora{" "}
          {(Number(contract.late_interest_monthly) * 100).toFixed(0)}% a.m. pro-rata.
        </li>
        <li className="italic">Documento de demonstração — dados fictícios.</li>
      </ol>
    </footer>
  );
}
