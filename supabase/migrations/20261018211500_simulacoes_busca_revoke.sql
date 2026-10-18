-- O Supabase concede por padrão ALL nas tabelas novas do schema public a anon e
-- authenticated (default privileges). Com isso, o GRANT por coluna da migration
-- 20261018210000 não restringia nada: anon podia gravar created_at e tinha
-- SELECT/UPDATE/DELETE no nível de permissão (a RLS barrava, mas a intenção é
-- que nem a permissão exista). Aqui volta ao desenho original.
-- Aplicado em produção em 18/10/2026 junto da publicação.

REVOKE ALL ON public.simulacoes_busca FROM anon, authenticated;

GRANT INSERT (
  sessao, consentimento_versao, empreendimento, bairro, metragem, valor_imovel, prazo_compra,
  entrada_pct, usa_fgts, prazo_financiamento_meses, sistema, banco_id, elegivel_mcmv,
  faixa_renda, faixa_idade
) ON public.simulacoes_busca TO anon, authenticated;
GRANT SELECT ON public.simulacoes_busca TO authenticated;
GRANT ALL ON public.simulacoes_busca TO service_role;
