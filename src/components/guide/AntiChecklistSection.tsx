import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Wrench, ShieldCheck, DollarSign } from "lucide-react";
import SectionBlock from "./SectionBlock";

export default function AntiChecklistSection() {
  const warnings = [
    { title: "Aproveite bancadas da construtora", desc: "Trocar bancadas novas custa R$ 5.000+ e raramente muda a percepção do hóspede. Troque apenas se estiverem danificadas ou com padrão muito datado.", icon: Wrench },
    { title: "Cuidado com integração de sacada", desc: "Custo a partir de R$ 8.000 + riscos com regras do condomínio. Avalie se o ganho de espaço justifica o investimento e verifique a convenção antes.", icon: AlertTriangle },
    { title: "Não mexa no revestimento do banheiro", desc: "Remover revestimento original pode comprometer a impermeabilização (garantia geralmente de 5 anos). Risco de infiltração e custos imprevisíveis.", icon: ShieldCheck },
    { title: "Evite demolições e alterações de instalações", desc: "Prefira resolver com marcenaria e layout inteligente. Mover pontos hidráulicos ou elétricos encarece e atrasa. Trabalhe com a planta existente.", icon: AlertTriangle },
  ];

  return (
    <SectionBlock id="antichecklist" title="Anti-checklist: O que NÃO fazer" takeaway="Erros que destroem rentabilidade — aprenda antes de cometer.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {warnings.map((w) => (
          <Card key={w.title} className="border-destructive/20 bg-destructive/5"><CardContent className="p-5"><div className="flex items-start gap-3"><div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0"><w.icon className="text-destructive" size={18} /></div><div><p className="font-semibold text-foreground text-sm mb-1">{w.title}</p><p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p></div></div></CardContent></Card>
        ))}
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 flex items-start gap-3">
        <DollarSign className="text-primary mt-0.5 flex-shrink-0" size={22} />
        <div><p className="font-display font-bold text-foreground text-lg mb-1">Economia pode chegar a 30% no custo total</p><p className="text-sm text-muted-foreground">Ao evitar demolições desnecessárias e priorizar marcenaria + layout, investidores experientes economizam até 30% do orçamento de reforma — dinheiro que vai direto para decoração e fotos, onde o retorno é comprovado.</p></div>
      </div>
      <Accordion type="multiple" className="mt-4 font-body">
        <AccordionItem value="custos-evitaveis"><AccordionTrigger className="text-primary font-semibold">Detalhamento dos custos evitáveis</AccordionTrigger><AccordionContent>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground font-medium">Item evitável</th><th className="text-right py-2 text-muted-foreground font-medium">Custo médio</th><th className="text-left py-2 pl-4 text-muted-foreground font-medium">Alternativa inteligente</th><th className="text-right py-2 text-muted-foreground font-medium">Economia</th></tr></thead><tbody>
            <tr className="border-b border-border/50"><td className="py-2 text-foreground">Trocar bancadas novas</td><td className="py-2 text-right text-muted-foreground">R$ 5.200</td><td className="py-2 pl-4 text-muted-foreground">Manter originais da construtora</td><td className="py-2 text-right font-medium text-primary">R$ 5.200</td></tr>
            <tr className="border-b border-border/50"><td className="py-2 text-foreground">Integrar sacada</td><td className="py-2 text-right text-muted-foreground">R$ 8.000+</td><td className="py-2 pl-4 text-muted-foreground">Decorar sacada como espaço funcional</td><td className="py-2 text-right font-medium text-primary">R$ 7.000+</td></tr>
            <tr className="border-b border-border/50"><td className="py-2 text-foreground">Remover revestimento banheiro</td><td className="py-2 text-right text-muted-foreground">R$ 6.000+</td><td className="py-2 pl-4 text-muted-foreground">Pintura epóxi ou adesivos sobre o existente</td><td className="py-2 text-right font-medium text-primary">R$ 5.000+</td></tr>
            <tr className="border-b border-border/50"><td className="py-2 text-foreground">Mover pontos hidráulicos</td><td className="py-2 text-right text-muted-foreground">R$ 4.000+</td><td className="py-2 pl-4 text-muted-foreground">Trabalhar com a planta existente</td><td className="py-2 text-right font-medium text-primary">R$ 4.000+</td></tr>
          </tbody></table></div>
        </AccordionContent></AccordionItem>
        <AccordionItem value="quando-demolir"><AccordionTrigger className="text-primary font-semibold">Quando SIM faz sentido demolir</AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground leading-relaxed">Apenas quando o layout atual impede a funcionalidade básica do studio (ex: cozinha inacessível, banheiro sem ventilação mínima) <strong className="text-foreground">E</strong> o ROI projetado compensa o custo adicional. Antes de demolir, faça a conta: se a demolição custa R$ 10.000 e o ganho mensal projetado é R$ 300, o payback será de +33 meses — provavelmente não compensa. Consulte um arquiteto com experiência em short stay antes de tomar essa decisão.</p></AccordionContent></AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
