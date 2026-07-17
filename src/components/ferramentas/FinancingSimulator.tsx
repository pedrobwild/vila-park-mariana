import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

const financingSchema = z.object({
  propertyValue: z
    .number({ invalid_type_error: "Informe o valor do imóvel" })
    .positive("O valor do imóvel deve ser maior que zero"),
  downPayment: z
    .number({ invalid_type_error: "Informe o valor de entrada" })
    .nonnegative("A entrada não pode ser negativa"),
  termMonths: z
    .number({ invalid_type_error: "Informe o prazo em meses" })
    .int("O prazo deve ser um número inteiro de meses")
    .positive("O prazo deve ser maior que zero"),
  monthlyRate: z
    .number({ invalid_type_error: "Informe a taxa mensal" })
    .positive("A taxa deve ser maior que zero"),
});

interface Result {
  financedAmount: number;
  installment: number;
  totalPaid: number;
  totalInterest: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinancingSimulator() {
  const [propertyValue, setPropertyValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  const handleCalculate = () => {
    const parsed = financingSchema.safeParse({
      propertyValue: parseFloat(propertyValue.replace(",", ".")),
      downPayment: parseFloat(downPayment.replace(",", ".")),
      termMonths: parseInt(termMonths, 10),
      monthlyRate: parseFloat(monthlyRate.replace(",", ".")),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      setResult(null);
      return;
    }

    setErrors({});
    const { propertyValue: pv, downPayment: dp, termMonths: n, monthlyRate: rate } = parsed.data;

    const financedAmount = Math.max(pv - dp, 0);
    const i = rate / 100;

    let installment: number;
    if (i === 0) {
      installment = financedAmount / n;
    } else {
      installment = (financedAmount * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    }

    const totalPaid = installment * n;
    const totalInterest = totalPaid - financedAmount;

    setResult({ financedAmount, installment, totalPaid, totalInterest });
  };

  return (
    <section className="scroll-mt-24 py-16 md:py-20">
      <div className="mb-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Simulador de Financiamento
        </h2>
        <p className="text-muted-foreground mt-1 max-w-xl">
          Informe os valores abaixo para simular sua parcela mensal pelo sistema Price. Os valores são apenas
          uma estimativa e não substituem a simulação oficial do seu banco.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Dados da simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="propertyValue">Valor do imóvel (R$)</Label>
              <Input
                id="propertyValue"
                inputMode="decimal"
                placeholder="Ex: 650000"
                value={propertyValue}
                onChange={(e) => setPropertyValue(e.target.value)}
              />
              {errors.propertyValue && <p className="text-xs text-destructive">{errors.propertyValue}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="downPayment">Valor de entrada (R$)</Label>
              <Input
                id="downPayment"
                inputMode="decimal"
                placeholder="Ex: 130000"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
              />
              {errors.downPayment && <p className="text-xs text-destructive">{errors.downPayment}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="termMonths">Prazo (meses)</Label>
              <Input
                id="termMonths"
                inputMode="numeric"
                placeholder="Ex: 360"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
              />
              {errors.termMonths && <p className="text-xs text-destructive">{errors.termMonths}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monthlyRate">Taxa de juros mensal (%)</Label>
              <Input
                id="monthlyRate"
                inputMode="decimal"
                placeholder="Ex: 0,9"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
              />
              {errors.monthlyRate && <p className="text-xs text-destructive">{errors.monthlyRate}</p>}
            </div>

            <Button onClick={handleCalculate} size="lg" className="w-full min-h-[48px]">
              Calcular parcela
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                Preencha os campos e clique em "Calcular parcela" para ver o resultado.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor financiado</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatCurrency(result.financedAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Parcela mensal</p>
                  <p className="font-display text-lg font-bold text-primary">
                    {formatCurrency(result.installment)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total pago</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatCurrency(result.totalPaid)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total de juros</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatCurrency(result.totalInterest)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
