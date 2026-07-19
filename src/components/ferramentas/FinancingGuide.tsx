import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Printer, FileText } from "lucide-react";
import {
  INSTITUTION_RATES,
  MODALITY_LABEL,
  SITUATION_LABEL,
} from "@/data/institutionRates";
import { PCT_PT } from "@/lib/financing";

const STEPS = [
  "Simulação inicial (valor, entrada, prazo, sistema).",
  "Análise de crédito e comprovação de renda pelo banco.",
  "Avaliação do imóvel por engenheiro credenciado.",
  "Análise jurídica dos documentos (comprador, vendedor, imóvel).",
  "Assinatura do contrato de financiamento.",
  "Registro do contrato no cartório de imóveis.",
  "Liberação do recurso pelo banco ao vendedor.",
];

const DOCS = [
  "RG e CPF de todos os compradores",
  "Comprovante de estado civil e certidão atualizada",
  "Comprovante de renda (holerite, DECORE, IR)",
  "Comprovante de residência atualizado",
  "Extrato do FGTS (se for usar)",
  "Certidões negativas (cível, trabalhista, criminal)",
  "Matrícula atualizada do imóvel + IPTU",
];

const TIPS = [
  {
    title: "1. O banco financia sobre o MENOR valor entre preço e avaliação",
    body:
      "Exemplo: você fecha o imóvel por R$ 600 mil e o banco avalia em R$ 550 mil. Com LTV de 80%, o crédito máximo é 80% × 550 mil = R$ 440 mil, e não R$ 480 mil. A diferença sai do seu bolso.",
  },
  {
    title: "2. Relacionamento reduz a taxa",
    body:
      "Conta-salário, débito automático, seguros e investimentos costumam ser condições para a taxa mínima. Pergunte quais 'contrapartidas' liberam qual taxa antes de assinar.",
  },
  {
    title: "3. Você pode compor renda com 2–3 pessoas",
    body:
      "Alguns bancos (BB, Sicoob) aceitam composição sem vínculo familiar. Isso aumenta o limite aprovado sem aumentar seu compromisso mensal individual.",
  },
  {
    title: "4. Idade + prazo devem caber em ~80 anos",
    body:
      "A idade do proponente mais velho + o prazo do financiamento não pode ultrapassar cerca de 80 anos. Além disso, o seguro MIP encarece com a idade — quem está mais velho como proponente principal aumenta o custo total.",
  },
  {
    title: "5. Alguns bancos financiam ITBI e cartório",
    body:
      "BB, Sicoob e BRB podem incluir custos de aquisição na operação (sujeito a análise). Isso reduz o desembolso inicial, mas aumenta o total pago.",
  },
  {
    title: "6. Aprovação em um banco vale como alavanca em outro",
    body:
      "Cote em 2 ou 3 bancos na mesma semana. Uma proposta aprovada com taxa menor costuma abrir espaço para o banco de relacionamento cobrir.",
  },
  {
    title: "7. Portabilidade: você pode trocar de banco depois",
    body:
      "Se a taxa cair no futuro, é possível levar o contrato para outro banco com custo baixo. Guarde essa carta como plano B — nenhum financiamento precisa ficar 30 anos no mesmo lugar.",
  },
  {
    title: "8. Compare sempre o CET, nunca só a taxa anunciada",
    body:
      "O Custo Efetivo Total inclui seguros, tarifas e IOF. Duas taxas iguais podem esconder CETs bem diferentes conforme o pacote de seguros e a tarifa administrativa.",
  },
];

export default function FinancingGuide() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="border-border/60 card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Como conseguir a liberação do financiamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="steps">
              <AccordionTrigger className="text-sm">Passo a passo da aprovação</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                  {STEPS.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <p className="text-xs font-semibold text-foreground mt-3">Documentos típicos</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {DOCS.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="programs">
              <AccordionTrigger className="text-sm">Programas que reduzem a taxa</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">MCMV Faixas 1–3:</strong> subsídio direto no valor do imóvel e taxas reduzidas por faixa de renda familiar.</p>
                <p><strong className="text-foreground">MCMV Classe Média:</strong> imóvel até R$ 600 mil, renda familiar até R$ 13 mil, taxa 10% nominal a.a. + TR.</p>
                <p><strong className="text-foreground">Pró-Cotista FGTS:</strong> 3+ anos de FGTS, sem imóvel no município e sem financiamento SFH ativo — libera taxas menores no SBPE.</p>
                <p><strong className="text-foreground">FGTS na entrada/amortização:</strong> 3 anos de contribuição, imóvel em SP até R$ 1,5 mi, sem outro imóvel na mesma cidade.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tips">
              <AccordionTrigger className="text-sm">O que pouca gente sabe (8 dicas)</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  {TIPS.map((t) => (
                    <li key={t.title}>
                      <p className="font-semibold text-foreground">{t.title}</p>
                      <p className="text-muted-foreground">{t.body}</p>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="disclaimer">
              <AccordionTrigger className="text-sm">O que a simulação NÃO garante</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Não garante aprovação de crédito, enquadramento em programa (MCMV, Pró-Cotista), uso do FGTS,
                taxa promocional divulgada nem o valor de avaliação do imóvel pelo banco. Todas essas variáveis
                dependem de análise e políticas da instituição.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setOpen(true)}>
            <FileText className="h-4 w-4" /> Baixar guia completo (PDF)
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Guia do Financiamento Imobiliário</span>
              <Button size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="print-report space-y-6 py-4">
            <div className="border-b border-border/60 pb-4">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">Vila Park · Vila Mariana</p>
              <h1 className="font-display text-2xl font-bold text-foreground mt-1">
                Guia do Financiamento Imobiliário
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Emitido em {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">Sumário</h2>
              <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-0.5">
                <li>Passo a passo da aprovação</li>
                <li>Documentos necessários</li>
                <li>Programas que reduzem a taxa</li>
                <li>8 dicas para conseguir melhores condições</li>
                <li>Custos de aquisição em São Paulo</li>
                <li>Comparativo de instituições</li>
                <li>Glossário</li>
                <li>Avisos</li>
              </ol>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">1. Passo a passo da aprovação</h2>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                {STEPS.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">2. Documentos necessários</h2>
              <ul className="list-disc pl-5 text-sm">
                {DOCS.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">3. Programas que reduzem a taxa</h2>
              <div className="text-sm space-y-2">
                <p><strong>MCMV Faixas 1–3:</strong> subsídio direto e taxas reduzidas por faixa de renda.</p>
                <p><strong>MCMV Classe Média:</strong> imóvel ≤ R$ 600 mil, renda ≤ R$ 13 mil, 10% nominal a.a. + TR.</p>
                <p><strong>Pró-Cotista FGTS:</strong> 3+ anos de FGTS, sem imóvel no município nem financiamento SFH ativo.</p>
                <p><strong>Uso do FGTS na entrada:</strong> 3 anos de contribuição, imóvel em SP até R$ 1,5 mi, sem outro imóvel na cidade.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">4. Oito dicas para conseguir melhores condições</h2>
              <ul className="space-y-2 text-sm">
                {TIPS.map((t) => (
                  <li key={t.title}>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-muted-foreground">{t.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">5. Custos de aquisição em São Paulo</h2>
              <ul className="list-disc pl-5 text-sm">
                <li>ITBI: 3% do valor do imóvel.</li>
                <li>Escritura + registro: ~1,5% do valor do imóvel.</li>
                <li>Avaliação bancária: ~R$ 3.100 (varia por banco).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">6. Comparativo de instituições</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-1 pr-2">Banco</th>
                    <th className="py-1 pr-2">Produto</th>
                    <th className="py-1 pr-2">Modalidade</th>
                    <th className="py-1 pr-2">Taxa a.a.</th>
                    <th className="py-1 pr-2">Situação</th>
                    <th className="py-1">Consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTITUTION_RATES.map((r) => (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="py-1 pr-2">{r.bank}</td>
                      <td className="py-1 pr-2">{r.product}</td>
                      <td className="py-1 pr-2">{MODALITY_LABEL[r.modality]}</td>
                      <td className="py-1 pr-2">
                        {r.annualRate == null ? "Sob consulta" : `${PCT_PT(r.annualRate)} ${r.annualRateType}`}
                      </td>
                      <td className="py-1 pr-2">{SITUATION_LABEL[r.situation]}</td>
                      <td className="py-1">{new Date(r.consultedAt).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="font-display font-bold text-lg mb-2">7. Glossário rápido</h2>
              <dl className="text-sm space-y-1">
                <div><strong>CET:</strong> Custo Efetivo Total — taxa que inclui juros, seguros, tarifas e IOF.</div>
                <div><strong>SAC:</strong> parcelas decrescentes; menor total de juros.</div>
                <div><strong>Price:</strong> parcelas fixas; mais previsível, total maior.</div>
                <div><strong>TR:</strong> Taxa Referencial, quase sempre próxima de zero.</div>
                <div><strong>IPCA:</strong> índice oficial de inflação; corrige parcela e saldo.</div>
                <div><strong>MIP:</strong> seguro por morte/invalidez, varia com a idade.</div>
                <div><strong>DFI:</strong> seguro do imóvel (danos físicos).</div>
                <div><strong>ITBI:</strong> imposto de transmissão do imóvel (3% em SP).</div>
                <div><strong>SFH:</strong> Sistema Financeiro da Habitação — regras federais (LTV 80%, prazo 420m).</div>
              </dl>
            </section>

            <section className="text-xs text-muted-foreground border-t border-border/60 pt-3 space-y-2">
              <p>
                <strong>Aviso 1.</strong> As taxas e condições apresentadas correspondem às informações públicas
                localizadas na data indicada. A aprovação e as condições efetivas dependem da análise de crédito,
                renda, entrada, prazo, avaliação do imóvel, relacionamento bancário, regularidade do imóvel e
                políticas da instituição. Compare o Custo Efetivo Total e consulte as propostas oficiais antes da
                contratação.
              </p>
              <p>
                <strong>Aviso 2.</strong> Informações tributárias, documentais e jurídicas podem variar conforme a
                operação e devem ser confirmadas com profissionais habilitados, com o banco e com os órgãos
                competentes.
              </p>
              <p>
                <strong>Aviso 3.</strong> As informações apresentadas têm caráter educacional e geral. Taxas,
                políticas de crédito, tributos e regras podem mudar e dependem da análise da instituição financeira
                e da situação concreta. Consulte as fontes oficiais e profissionais habilitados antes de contratar
                ou tomar decisões.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
