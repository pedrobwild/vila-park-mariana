import { useState } from "react";
import { ChevronDown, Crown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { districtByName, formatBRL } from "@/data/districtMetrics";

const VERDICTS: Record<string, string> = {
  "Consolação": "Melhor custo-benefício",
  "Pinheiros": "Diária alta, ticket elevado",
  "Itaim Bibi": "Premium, mas yield menor",
  "Vila Mariana": "Boa ocupação, ticket médio",
  "Moema": "Diária boa, preço alto",
  "República": "Ticket baixo, risco maior",
};

const NAMES = ["Consolação", "Pinheiros", "Itaim Bibi", "Vila Mariana", "Moema", "República"];

function buildRows() {
  return NAMES.map((n) => {
    const d = districtByName.get(n);
    if (!d) return null;
    const priceSqm = d.priceSqm;
    const yieldEst = ((d.nightlyRateBRL * (d.occupancyPercent / 100) * 365) / (priceSqm * 30)) * 100;
    return {
      name: n,
      daily: formatBRL(d.nightlyRateBRL),
      occ: `${d.occupancyPercent}%`,
      price: `R$ ${priceSqm.toLocaleString("pt-BR")}`,
      yield: yieldEst.toFixed(1).replace(".", ",") + "%",
      yieldNum: yieldEst,
      highlight: n === "Consolação",
      verdict: VERDICTS[n] || "",
    };
  }).filter(Boolean) as Array<{
    name: string; daily: string; occ: string; price: string;
    yield: string; yieldNum: number; highlight: boolean; verdict: string;
  }>;
}

function MobileCards({ rows }: { rows: ReturnType<typeof buildRows> }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, 3);

  return (
    <div className="space-y-3">
      {visible.map((row) => (
        <div
          key={row.name}
          className={`rounded-xl border p-4 ${
            row.highlight
              ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
              : "border-border/60 bg-background"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {row.highlight && <Crown className="h-4 w-4 text-accent" />}
              <span className={`text-sm font-bold ${row.highlight ? "text-accent" : "text-foreground"}`}>
                {row.name}
              </span>
            </div>
            <Badge
              className={`text-[10px] font-semibold px-2 py-0.5 ${
                row.highlight
                  ? "bg-accent/15 text-accent border-accent/30"
                  : "bg-muted text-muted-foreground border-border/40"
              }`}
            >
              {row.verdict}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { label: "Diária", value: row.daily },
              { label: "Ocupação", value: row.occ },
              { label: "Preço/m²", value: row.price },
              { label: "Yield bruto", value: row.yield },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className={`text-sm font-semibold ${
                  m.label === "Yield bruto" && row.highlight ? "text-accent" : "text-foreground"
                }`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus-visible:rounded-lg"
        aria-expanded={showAll}
      >
        {showAll ? "Ver top 3" : "Ver todos os bairros"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <Accordion type="single" collapsible className="mt-2">
        <AccordionItem value="yield" className="border border-border/60 rounded-xl px-4">
          <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              O que é Yield bruto estimado?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 space-y-2">
            <p>
              O <strong className="text-foreground">yield bruto</strong> é a relação entre a receita anual de aluguel e o valor investido — quanto maior, mais rápido o imóvel "se paga".
            </p>
            <p className="font-mono text-xs bg-muted px-2 py-1.5 rounded border border-border/60 inline-block">
              (diária × ocupação × 365) ÷ custo do imóvel
            </p>
            <p>
              A Consolação lidera porque combina <strong className="text-foreground">diária competitiva</strong> com <strong className="text-foreground">preço de aquisição menor</strong> que vizinhos.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-[11px] text-muted-foreground/60 mt-2">
        Fonte: AirDNA, pesquisa Bwild 2025. Studios 20–35 m².
      </p>
    </div>
  );
}

function DesktopTable({ rows }: { rows: ReturnType<typeof buildRows> }) {
  const consYield = rows.find(r => r.name === "Consolação")?.yield || "";

  return (
    <>
      <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
        Consolação vs. outros bairros
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Yield estimado considera diária média, ocupação e preço de aquisição por m².
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Bairro</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Diária média</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Ocupação</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Preço/m²</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Yield bruto est.</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Veredito</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className={`border-b border-border/20 last:border-0 ${row.highlight ? "bg-primary/5" : ""}`}
              >
                <td className={`py-3 px-4 font-medium ${row.highlight ? "text-primary font-bold" : "text-foreground"}`}>
                  {row.highlight && <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 align-middle" />}
                  {row.name}
                </td>
                <td className="text-center py-3 px-4 text-muted-foreground">{row.daily}</td>
                <td className="text-center py-3 px-4 text-muted-foreground">{row.occ}</td>
                <td className="text-center py-3 px-4 text-muted-foreground">{row.price}</td>
                <td className={`text-center py-3 px-4 font-bold ${row.highlight ? "text-primary" : "text-foreground"}`}>
                  {row.yield}
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${row.highlight ? "bg-primary/10 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
                    {row.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded-xl border border-border/60 bg-muted/30 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">O que é Yield bruto estimado?</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O <strong className="text-foreground">yield bruto</strong> é a relação entre a receita anual de aluguel e o valor investido — quanto maior, mais rápido o imóvel "se paga". Cálculo: <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border border-border/60">(diária × ocupação × 365) ÷ custo do imóvel</span>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A Consolação lidera com <strong className="text-primary">{consYield}</strong> porque combina <strong className="text-foreground">diária competitiva</strong> com <strong className="text-foreground">preço de aquisição por m² menor</strong> que vizinhos como Pinheiros e Itaim.
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-3">
        Fonte: AirDNA, pesquisa Bwild 2025. Valores médios para studios 20–35 m².
      </p>
    </>
  );
}

export default function ComparativoRegional({ isMobile }: { isMobile: boolean }) {
  const rows = buildRows();
  if (rows.length === 0) return null;

  // Ensure Consolação is first on mobile
  const sorted = isMobile
    ? [rows.find(r => r.highlight)!, ...rows.filter(r => !r.highlight)]
    : rows;

  return isMobile ? <MobileCards rows={sorted} /> : <DesktopTable rows={sorted} />;
}
