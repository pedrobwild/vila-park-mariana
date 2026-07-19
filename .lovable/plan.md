Escopo grande (≈25 arquivos, 6 áreas). Confirme antes de executar — depois vou em batch paralelo por área.

## 1. Design system (tokens + fontes)
- `index.html`: importar Google Fonts Fraunces (400–600 + itálico) e Inter (400–600).
- `tailwind.config.ts`: adicionar `fontFamily: { display: ['Fraunces', ...], sans: ['Inter', ...] }` + tabular-nums utility.
- `src/index.css`: novos tokens — `--accent: 24 58% 46%`, `--ring` cobre, background `30 25% 98.5%`, borders `30 12% 90%`, `--radius: 0.625rem`. Atualizar `.text-gradient-premium`, `.bg-accent-brand`. Sombras mais suaves. Novo utilitário `.eyebrow` e `.tabular`.

## 2. Componentes compartilhados novos (src/components/shared/)
- `SectionLabel.tsx` (extraído dos guias — remover cópias locais)
- `KpiCard.tsx` (idem)
- `KeyFactsStrip.tsx` — faixa horizontal com números Fraunces grandes, divisores verticais (10 pav · 33 aptos · 1.600 m² · 900 m do metrô), lê `propertyData`.
- `SiteFooter.tsx` — footer único (logo, endereço, contato via WHATSAPP_PHONE, links, disclaimer). Usado em Index, Ferramentas, Oportunidades, dois Guias.
- `NeighborhoodSection.tsx` — fonte única `surroundings.ts`, prop `variant: 'compact' | 'full'`. Substitui a seção ENTORNO do Index, `nearby` do InvestorGuide e `localizacao` do UrbanFlex (apagando `nearbyByCategory` hardcoded).

## 3. Dados unificados
- `src/data/faq.ts` — categorias `buyer` / `investor`. Migra chaves i18n existentes para `faq.buyer.*` e `faq.investor.*` (pt+en). Remove sobreposição (6 perguntas gerais só em `buyer`; investment-only em `investor`).
- Constante WHATSAPP_PHONE já existe em `surroundings.ts` — trocar hardcodes em `Ferramentas.tsx` e `UrbanFlexInvestorGuide.tsx`.

## 4. AppNavbar
- Remover ícones dos links; altura 72px desktop; ordem: Oportunidades · Guia do Investidor · Guia do Comprador · Ferramentas · Painel.
- Botão "Falar com especialista" (discreto, outline) à direita antes do idioma/auth.
- Mobile menu ganha "Guia do Comprador".

## 5. Páginas
- **Index**: hero overlay grafite 60–75%, headline Fraunces novo copy PT/EN (i18n), badge endereço vira eyebrow. Substituir bloco Yield+MarketIntel por teaser (3 números + botão para guia). Substituir cards KPI por `KeyFactsStrip`. Trocar seção ENTORNO por `NeighborhoodSection`. Substituir footer local pelo `SiteFooter`.
- **Oportunidades**: header com eyebrow+título+`KeyFactsStrip`; tabela: preço Fraunces, badges refinados (verde/âmbar/neutro suaves), hover linhas, thumbnails de planta. Empty state elegante. `SiteFooter`.
- **Ferramentas**: header eyebrow+Fraunces; CTA principal cobre, secundários grafite; `SiteFooter`; WhatsApp via constante.
- **InvestorGuide**: 
  - Remove `SectionLabel`/`KpiCard` locais (usa shared).
  - Fundir `marketData` + `market` (MarketIntel) em uma seção "Mercado".
  - Nav reduzida a 8 chips (Início · Diagnóstico · Tese · Tipologias · Simulador · Retorno · Mercado · Eventos · FAQ · Contato) — âncoras antigas mantidas como redirects internos.
  - Hero card de pilares vira `KeyFactsStrip` (pilares só na seção Tese).
  - `NeighborhoodSection variant="full"` no lugar do `nearby` atual.
  - FAQ consome `faq.ts` categoria `investor`.
  - `SiteFooter`.
- **UrbanFlexInvestorGuide** (Guia do Comprador):
  - Remove MarketIntelSection e `nearbyByCategory` hardcoded.
  - Substitui cores `hsl(24,90%,50%)` por tokens (`hsl(var(--accent))` etc).
  - Funde "Por que morar aqui" + "Diferenciais" em uma seção "6 diferenciais" sem sobreposição.
  - Substitui card "Preço acessível" por "Custo de entrada inteligente" (mesmo fato, tom premium).
  - `NeighborhoodSection` compartilhado. FAQ consome `faq.ts` categoria `buyer`. `SiteFooter`. WhatsApp constante.

## 6. i18n
- Atualizar pt.json + en.json em paridade estrita para: novo headline hero Index, nova copy Ferramentas header, novo card "Custo de entrada inteligente", reestruturação FAQ (`faq.buyer.*` / `faq.investor.*`), rótulos KeyFactsStrip, SiteFooter, botão "Falar com especialista", nav "Guia do Comprador" desktop.
- Rodar `bunx vitest run src/i18n` para garantir paridade.

## 7. Verificação
- `bunx vitest run` (todos os 87+ testes).
- Typecheck implícito via build.

## Restrições respeitadas
- Zero mudanças em lógica de simuladores, hooks, Supabase, Admin, Insights, testes existentes.
- Zero hex/hsl inline — só tokens.
- WCAG AA: cobre em texto pequeno usa `24 58% 40%`.
- Sticky CTA mobile do Index preservado.

Aprovar para eu executar em ondas paralelas: (A) design system + fontes, (B) componentes shared + faq.ts, (C) AppNavbar + páginas Index/Oportunidades/Ferramentas, (D) dois guias, (E) i18n + testes.