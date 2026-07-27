
# Inteligência de mercado no negócio do CRM

## A) Como funciona hoje a inteligência de mercado neste projeto

Existem **duas trilhas separadas**, nenhuma delas ligada ao CRM:

1. **Dados quantitativos Airbnb por bairro — hoje são estáticos (mock em código).**
   - `src/hooks/useIntelligenceData.ts` expõe um array `MOCK_BAIRROS` tipado por `BairroAirbnb` (`src/types/intelligence.ts`), servido via `useQuery` do React Query. Não há tabela no banco nem edge function por trás.
   - Granularidade: **bairro × cidade** (Vila Mariana, Pinheiros, Consolação, Itaim, Moema, Brooklin, Vila Olímpia, República, Liberdade, Bela Vista…), período `2025-01`→`2025-12`, `fonte_primaria: "AirDNA"`, `data_atualizacao: 2026-03-01`.
   - Métricas já disponíveis e diretamente reaproveitáveis: `ocupacao_media_studio`, `adr_medio_studio` (diária média), `n_listings_total` / `n_listings_studio_1q` (anúncios ativos), `preco_m2_residencial_medio` (R$/m²), `aluguel_mensal_long_term_medio`, `dias_medio_venda_imovel`, `area_media_estudio`, yields e scores.
   - **Não existe hoje:** tempo médio de vacância entre inquilinos (long stay). O campo mais próximo é `dias_medio_venda_imovel`, que é outra coisa.
   - Atualização: manual, editando o arquivo.
   - Camada de leitura derivada: `src/lib/intelligenceInsights.ts`, `src/lib/investmentScore.ts`, `src/data/districtMetrics.ts`.

2. **Análise textual com fontes — edge function `market-intel` (Perplexity).**
   - `supabase/functions/market-intel/index.ts` chama `api.perplexity.ai` (modelo `sonar`, `search_recency_filter: month`) com `PERPLEXITY_API_KEY` já configurada, e devolve `{ content, citations[] }`.
   - O prompt já cobre exatamente as seções pedidas pelo gestor (valor do m², valorização 12 meses, perfil do morador, vantagens, lançamentos, tendências).
   - Consumido por `src/components/MarketIntelSection.tsx`, que hoje **não está montado em nenhuma página** (só há uma âncora `#market-intel` em `PropertyPlanoAcaoSection`). O cache é `sessionStorage` (6h), por navegador — não há cache no banco.
   - Limitações atuais: bairro/cidade fixos no prompt do servidor (texto amarra "Vila Mariana"), sem `generated_at` persistido, sem estrutura por seção (é markdown solto) e sem numeração de citações.
   - Precedente de cache em banco existe: tabela `elephant_insights_cache` + a função `elephant-insights` (rate limit em memória, TTL 6h, service role).

## B) Estrutura do negócio no CRM

- Tabela: **`crm_deals`** — `id, person_id, title, value_brl, notes, stage_id, broker_id, loss_reason_id, next_step, expected_close_date, share_token, …`. **Não tem finalidade nem localização.**
- Unidades de interesse: `crm_deal_units` → **`units`** (`code, block, area_m2, price_brl, status, planta_url`). **`units` não tem bairro/cidade** — o empreendimento é único (Vila Park, Vila Mariana), então o bairro é hoje implícito.
- Há campos dinâmicos (`custom_field_definitions` / `custom_field_values`) por unidade, mas são ruins como fonte de bairro/finalidade (sem tipagem forte, sem enum).

**Caminho aditivo mínimo:**
- `crm_deals.finalidade` → novo enum `crm_deal_purpose` (`short_stay | long_stay | moradia`), nullable, default `NULL` (sem finalidade = cabeçalho pede para escolher).
- Bairro: `units.bairro text` + `units.cidade text` com default `'Vila Mariana'` / `'São Paulo'` (backfill imediato), e resolução do bairro do negócio = bairro da unidade primária (`crm_deal_units.is_primary`), com fallback para o padrão do empreendimento em `crm_settings`.

## C) Quem vê e onde fica o cabeçalho

- Roles: `app_role` = `admin | incorporadora | user`; `public.is_staff()` libera admin+incorporadora. O `/admin` é protegido por `RequireAdmin` (`src/components/auth/RequireAdmin.tsx`) e o CRM vive em `src/pages/Admin.tsx` → `src/components/crm/CrmSection.tsx`.
- Cabeçalho do negócio: **`src/components/crm/DealDetailSheet.tsx`**, bloco `<SheetHeader>` a partir da linha ~364 (badge de etapa com dropdown, título, pessoa, valor). O corpo já é uma pilha de módulos: `ProposalsSection`, `DealTasksSection`, `DealCreditSection`, `DealCommissionSection` — o novo módulo entra nessa mesma pilha.

## D) Proposta de implementação (2 entregas)

### D1 — Cabeçalho de mercado condicional por finalidade

- Novo `src/lib/marketMetrics.ts`: resolve bairro do negócio, lê a base de bairros e devolve, por finalidade, um array de `{ label, value, source, referenceDate, missing }`.
  - **Short stay:** ocupação média · diária média (ADR) · anúncios ativos · R$/m².
  - **Long stay:** aluguel médio (mensal e R$/m²/mês) · vacância média entre inquilinos · R$/m².
  - **Moradia:** R$/m² · valorização · tempo médio de venda (subconjunto neutro).
- Novo `src/components/crm/DealMarketHeader.tsx`, logo abaixo do `<SheetHeader>`: faixa compacta de 4 métricas no padrão visual do projeto (reaproveita `KpiCard`/badges, `tabular`, `whitespace-nowrap`), com seletor de finalidade inline (grava em `crm_deals.finalidade`).
- Cada métrica com `Tooltip` mostrando **fonte** (ex.: AirDNA · Vila Mariana) e **data de referência**; métrica sem dado exibe "—" com o texto honesto **"Sem dados para este bairro"** (nunca zero, nunca valor inventado).
- Sem finalidade definida: estado vazio curto "Defina a finalidade para ver os dados de mercado do bairro" + seletor.
- Fonte de dados nesta entrega: a base existente `useIntelligenceData` promovida a `market_neighborhood_metrics` (tabela aditiva, seed com os mesmos números), para permitir bairros novos sem deploy. A vacância long stay entra como coluna nova, preenchida onde houver dado e nula (estado honesto) onde não houver.

### D2 — Módulo "Inteligência de Mercado" no negócio

- Novo `src/components/crm/DealMarketIntelSection.tsx`, na pilha de módulos do `DealDetailSheet`, colapsável como os demais.
- Conteúdo: resumo estruturado em seções fixas — **Valor do m² · Valorização 12 meses · Perfil do morador · Vantagens para morar · Novos lançamentos recentes · Tendências · Leitura prática (comprador / investidor)** — com **citações numeradas [1][2]** clicáveis quando houver URL, e rodapé "Análise gerada em DD/MM/AAAA · fontes: …".
- Geração: evolução da edge function existente `market-intel` (mesma linha de inteligência), passando a:
  - aceitar `{ bairro, cidade, finalidade }` e parametrizar o prompt (hoje ele amarra Vila Mariana no texto do sistema);
  - pedir **saída estruturada em JSON** por seção (`{ secoes: [{ id, titulo, texto, refs:[n] }], fontes: [{ n, titulo, url }] }`) em vez de markdown solto;
  - persistir em cache no banco e devolver `generated_at`;
  - manter as regras anti-alucinação já escritas (não inventar POIs/incorporadoras).
- Cache em tabela aditiva **`market_insights`** (`bairro, cidade, finalidade, payload jsonb, sources jsonb, model text, generated_at timestamptz`), TTL 7 dias, chave única (bairro, cidade, finalidade) — mesmo padrão de `elephant_insights_cache`.
- Botão **"Atualizar análise"** força regeneração (ignora TTL), com estado de carregamento e toast de erro amigável; sem análise em cache, o módulo mostra CTA "Gerar análise do bairro" em vez de disparar automaticamente (controle de custo).

## E) Migrations aditivas e riscos

Migrations (todas aditivas, nenhuma destrutiva):
1. `CREATE TYPE crm_deal_purpose` + `ALTER TABLE crm_deals ADD COLUMN finalidade crm_deal_purpose` (nullable).
2. `ALTER TABLE units ADD COLUMN bairro text DEFAULT 'Vila Mariana', ADD COLUMN cidade text DEFAULT 'São Paulo'` + backfill.
3. `CREATE TABLE market_neighborhood_metrics` (bairro, cidade, métricas short/long stay, `vacancia_media_dias`, `fonte`, `data_referencia`) + GRANTs + RLS (leitura para `authenticated`; escrita só `admin` via `has_role`) + seed com os números atuais de `MOCK_BAIRROS`.
4. `CREATE TABLE market_insights` (cache do D2) + GRANTs + RLS (leitura `authenticated`; escrita apenas `service_role`, gravada pela edge function).

Riscos e mitigações:
- **RLS:** ambas as tabelas novas nascem com RLS + GRANT explícito; nada de `anon`. A análise de bairro não é PII, mas fica restrita ao staff para não vazar para a vitrine pública.
- **Custo de API (Perplexity):** cache de 7 dias por (bairro, finalidade) e geração sob demanda (nunca no `onMount` do Sheet) limitam o gasto a algumas chamadas por bairro.
- **Rate limit:** replicar o limitador em memória da `elephant-insights` (10 req/min por chave) na `market-intel`, com mensagens 429/402 já tratadas no frontend.
- **Qualidade do dado:** os números de bairro hoje são mock/AirDNA de referência; o cabeçalho sempre exibirá fonte + data e "sem dados" quando faltar, para não passar estimativa como fato ao cliente.
- **Regressão:** `MarketIntelSection.tsx` (uso público) continua funcionando — a edge function mantém compatibilidade com o payload antigo.

## Confirmações antes de codar
- A vacância long stay: posso seeds com estimativa marcada como "estimativa de mercado" ou prefere deixar "sem dados" até você fornecer a base?
- A finalidade é por **negócio** (como proposto) ou por **unidade**?
</content>
