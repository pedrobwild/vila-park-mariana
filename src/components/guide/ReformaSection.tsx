import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Lightbulb, Wrench, Star } from "lucide-react";
import sectionReforma from "@/assets/section-reforma.jpg";
import SectionBlock from "./SectionBlock";
import { fmt } from "@/data/guide-data";

export default function ReformaSection() {
  const pisoData = { vinilico: [{ item: "Material", valor: 66, area: 25 }, { item: "Instalação", valor: 25, area: 25 }, { item: "Preparação", valor: 12, area: 25 }], porcelanato: [{ item: "Material", valor: 110, area: 25 }, { item: "Instalação", valor: 85, area: 25 }, { item: "Preparação", valor: 40, area: 25 }] };
  const totalVinilico = pisoData.vinilico.reduce((s, r) => s + r.valor * r.area, 0);
  const totalPorcelanato = pisoData.porcelanato.reduce((s, r) => s + r.valor * r.area, 0);
  const diffPiso = totalPorcelanato - totalVinilico;

  return (
    <SectionBlock id="reforma" title="Reforma Inteligente" takeaway="Quanto investir, onde priorizar e o que gera mais retorno por m².">
      <div className="rounded-2xl overflow-hidden mb-8 shadow-sm ring-1 ring-border"><img src={sectionReforma} alt="Antes e depois de reforma de studio" className="w-full h-40 md:h-64 object-cover" loading="lazy" width={800} height={256} /></div>
      <Tabs defaultValue="piso" className="font-body">
        <TabsList className="mb-4"><TabsTrigger value="piso" className="min-h-[44px] px-4">Piso (25m²)</TabsTrigger><TabsTrigger value="marcenaria" className="min-h-[44px] px-4">Marcenaria</TabsTrigger><TabsTrigger value="iluminacao" className="min-h-[44px] px-4">Iluminação vs Bancada</TabsTrigger></TabsList>
        <TabsContent value="piso">
          <Card className="border-border"><CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><h3 className="font-display font-bold text-foreground mb-3">Vinílico</h3><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground font-medium">Item</th><th className="text-right py-2 text-muted-foreground font-medium">R$/m²</th><th className="text-right py-2 text-muted-foreground font-medium">Subtotal</th></tr></thead><tbody>{pisoData.vinilico.map((r) => <tr key={r.item} className="border-b border-border/50"><td className="py-2 text-foreground">{r.item}</td><td className="py-2 text-right text-muted-foreground">R$ {r.valor}</td><td className="py-2 text-right text-foreground font-medium">R$ {fmt(r.valor * r.area)}</td></tr>)}<tr><td className="pt-3 font-bold text-foreground">Total</td><td></td><td className="pt-3 text-right font-bold text-primary text-lg">R$ {fmt(totalVinilico)}</td></tr></tbody></table></div>
              <div><h3 className="font-display font-bold text-foreground mb-3">Porcelanato</h3><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground font-medium">Item</th><th className="text-right py-2 text-muted-foreground font-medium">R$/m²</th><th className="text-right py-2 text-muted-foreground font-medium">Subtotal</th></tr></thead><tbody>{pisoData.porcelanato.map((r) => <tr key={r.item} className="border-b border-border/50"><td className="py-2 text-foreground">{r.item}</td><td className="py-2 text-right text-muted-foreground">R$ {r.valor}</td><td className="py-2 text-right text-foreground font-medium">R$ {fmt(r.valor * r.area)}</td></tr>)}<tr><td className="pt-3 font-bold text-foreground">Total</td><td></td><td className="pt-3 text-right font-bold text-primary text-lg">R$ {fmt(totalPorcelanato)}</td></tr></tbody></table></div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Comparativo de custo total</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3"><span className="text-sm w-28 text-muted-foreground">Vinílico</span><div className="flex-1 bg-muted rounded-full h-6 overflow-hidden"><motion.div className="h-full bg-primary rounded-full flex items-center justify-end pr-2" initial={{ width: 0 }} whileInView={{ width: `${(totalVinilico / totalPorcelanato) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6 }}><span className="text-xs text-primary-foreground font-bold">R$ {fmt(totalVinilico)}</span></motion.div></div></div>
                <div className="flex items-center gap-3"><span className="text-sm w-28 text-muted-foreground">Porcelanato</span><div className="flex-1 bg-muted rounded-full h-6 overflow-hidden"><motion.div className="h-full bg-accent rounded-full flex items-center justify-end pr-2" initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}><span className="text-xs text-accent-foreground font-bold">R$ {fmt(totalPorcelanato)}</span></motion.div></div></div>
              </div>
              <div className="bg-gold-light/50 border border-gold/20 rounded-xl p-4 flex items-center gap-2"><Lightbulb className="text-gold flex-shrink-0" size={16} /><p className="text-sm text-foreground">Diferença: <span className="font-bold">+R$ {fmt(diffPiso)}</span> pelo porcelanato. Para short stay, vinílico oferece melhor custo-benefício e resistência a riscos.</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="marcenaria">
          <Card className="border-border"><CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border"><CardContent className="p-5 text-center"><p className="text-3xl font-display font-bold text-primary">R$ 24.000</p><p className="text-sm text-muted-foreground mt-1">Armários fechados</p><Badge className="mt-2 bg-gold-light text-foreground border-0 font-body">Mais proteção</Badge></CardContent></Card>
              <Card className="border-border"><CardContent className="p-5 text-center"><p className="text-3xl font-display font-bold text-primary">R$ 19.000</p><p className="text-sm text-muted-foreground mt-1">Armários abertos / nichos</p><Badge className="mt-2 bg-gold-light text-foreground border-0 font-body">Mais estético</Badge></CardContent></Card>
            </div>
            <div className="bg-gold-light/50 border border-gold/20 rounded-xl p-4 flex items-start gap-3"><Lightbulb className="text-gold mt-0.5 flex-shrink-0" size={20} /><div><p className="font-semibold text-foreground text-sm mb-1">Marcenaria é o que aparece no anúncio</p><p className="text-sm text-muted-foreground">Equilibre estética e funcionalidade. Armários fechados protegem itens dos hóspedes, mas abertos com iluminação fotografam melhor e geram mais cliques.</p></div></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="iluminacao">
          <Card className="border-border"><CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/30 border-2"><CardContent className="p-5 text-center"><Lightbulb className="mx-auto mb-2 text-primary" size={28} /><p className="text-3xl font-display font-bold text-primary">R$ 2.800</p><p className="text-sm text-muted-foreground mt-1">Iluminação LED completa</p><p className="text-xs text-muted-foreground mt-1">Marcenaria + teto + fitas</p><Badge className="mt-2 bg-primary text-primary-foreground border-0 font-body">Melhor ROI</Badge></CardContent></Card>
              <Card className="border-border"><CardContent className="p-5 text-center"><Wrench className="mx-auto mb-2 text-muted-foreground" size={28} /><p className="text-3xl font-display font-bold text-foreground">R$ 5.200</p><p className="text-sm text-muted-foreground mt-1">Trocar bancadas (quartzo)</p><p className="text-xs text-muted-foreground mt-1">Demolição + material 2,8–3,2m</p><Badge variant="secondary" className="mt-2 font-body">Custo elevado</Badge></CardContent></Card>
            </div>
            <div className="bg-gold-subtle rounded-lg p-4 flex items-start gap-3"><Star className="text-accent mt-0.5 flex-shrink-0" size={20} /><div><p className="font-semibold text-foreground text-sm mb-1">Decisão do investidor</p><p className="text-sm text-muted-foreground">Iluminação gera impacto visual desproporcional ao custo: transforma fotos, eleva percepção de qualidade e custa quase metade da troca de bancada. Priorize iluminação sempre.</p></div></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <Accordion type="multiple" className="mt-4 font-body">
        <AccordionItem value="vinilico-roi"><AccordionTrigger className="text-primary font-semibold">Por que vinílico vence no ROI</AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground leading-relaxed">O vinílico custa 56% menos que porcelanato, tem instalação mais rápida (1-2 dias vs 3-5 dias) e é visualmente indistinguível em fotos de anúncio. Para short stay, onde o hóspede fica 2-5 dias, a percepção de qualidade é a mesma. Além disso, vinílico é mais silencioso, confortável ao pisar e mais fácil de reparar em caso de dano pontual — basta trocar uma régua.</p></AccordionContent></AccordionItem>
        <AccordionItem value="porcelanato"><AccordionTrigger className="text-primary font-semibold">Quando porcelanato faz sentido</AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground leading-relaxed">Em áreas molhadas (banheiro, cozinha aberta com pia) onde a resistência à água é crítica. Também faz sentido em studios de alto padrão (diária acima de R$ 400) onde o investimento adicional é compensado pela diária mais alta e pelo público-alvo que percebe a diferença. Se o condomínio já tem porcelanato em bom estado, não troque — aproveite.</p></AccordionContent></AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
