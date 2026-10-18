-- =========================================================
-- Simulações anônimas de quem ainda busca imóvel (/ferramentas, modo "busca")
--
-- Só é gravada quando a pessoa marca o consentimento na tela. Nada identifica
-- a pessoa: sem nome, contato, IP, renda ou idade exatas (só faixas).
-- "sessao" é um id aleatório por aba do navegador, usado apenas para contar a
-- última simulação de cada visita (quem refaz a conta várias vezes não infla os
-- números).
--
-- Escrita: anon/authenticated só podem INSERIR, e só nas colunas listadas.
-- Leitura: só o papel admin (Bewild). A incorporadora não lê esta tabela.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.simulacoes_busca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sessao uuid NOT NULL,
  consentimento_versao text NOT NULL
    CHECK (char_length(consentimento_versao) BETWEEN 1 AND 20),

  -- imóvel que a pessoa está avaliando (texto livre)
  empreendimento text CHECK (empreendimento IS NULL OR char_length(empreendimento) BETWEEN 1 AND 120),
  bairro text CHECK (bairro IS NULL OR char_length(bairro) BETWEEN 1 AND 80),
  bairro_chave text GENERATED ALWAYS AS (
    lower(translate(btrim(bairro),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'))
  ) STORED,
  metragem numeric(7,2) CHECK (metragem IS NULL OR metragem BETWEEN 10 AND 1000),
  valor_imovel numeric(14,2) NOT NULL CHECK (valor_imovel BETWEEN 50000 AND 100000000),
  preco_m2 numeric(12,2) GENERATED ALWAYS AS (
    CASE WHEN metragem IS NOT NULL AND metragem > 0 THEN round(valor_imovel / metragem, 2) END
  ) STORED,

  -- quando pretende comprar
  prazo_compra text CHECK (prazo_compra IS NULL OR prazo_compra IN
    ('ate_3_meses', '3_a_6_meses', '6_a_12_meses', 'mais_de_12_meses', 'nao_sei')),

  -- condições da simulação
  entrada_pct numeric(5,2) NOT NULL CHECK (entrada_pct BETWEEN 0 AND 100),
  usa_fgts boolean NOT NULL DEFAULT false,
  prazo_financiamento_meses integer NOT NULL CHECK (prazo_financiamento_meses BETWEEN 12 AND 420),
  sistema text NOT NULL CHECK (sistema IN ('SAC', 'PRICE')),
  banco_id text CHECK (banco_id IS NULL OR char_length(banco_id) BETWEEN 1 AND 60),
  elegivel_mcmv boolean NOT NULL DEFAULT false,

  -- perfil, só em faixas
  faixa_renda text CHECK (faixa_renda IS NULL OR faixa_renda IN
    ('ate_5k', '5k_10k', '10k_15k', '15k_25k', '25k_40k', 'acima_40k')),
  faixa_idade text CHECK (faixa_idade IS NULL OR faixa_idade IN
    ('18_24', '25_34', '35_44', '45_54', '55_mais'))
);

CREATE INDEX IF NOT EXISTS simulacoes_busca_created_at_idx ON public.simulacoes_busca (created_at DESC);
CREATE INDEX IF NOT EXISTS simulacoes_busca_bairro_chave_idx ON public.simulacoes_busca (bairro_chave);
CREATE INDEX IF NOT EXISTS simulacoes_busca_sessao_idx ON public.simulacoes_busca (sessao, created_at DESC);

-- 1) GRANTs — insert só nas colunas que o site envia (id, created_at e colunas geradas ficam de fora)
GRANT INSERT (
  sessao, consentimento_versao, empreendimento, bairro, metragem, valor_imovel, prazo_compra,
  entrada_pct, usa_fgts, prazo_financiamento_meses, sistema, banco_id, elegivel_mcmv,
  faixa_renda, faixa_idade
) ON public.simulacoes_busca TO anon, authenticated;
GRANT SELECT ON public.simulacoes_busca TO authenticated;
GRANT ALL ON public.simulacoes_busca TO service_role;

-- 2) RLS
ALTER TABLE public.simulacoes_busca ENABLE ROW LEVEL SECURITY;

-- 3) Policies
DROP POLICY IF EXISTS "simulacoes_busca_insert_publico" ON public.simulacoes_busca;
CREATE POLICY "simulacoes_busca_insert_publico" ON public.simulacoes_busca
  FOR INSERT TO anon, authenticated
  WITH CHECK (consentimento_versao IS NOT NULL);

DROP POLICY IF EXISTS "simulacoes_busca_select_admin" ON public.simulacoes_busca;
CREATE POLICY "simulacoes_busca_select_admin" ON public.simulacoes_busca
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Números agregados por bairro (admin). Considera a última simulação de cada
-- sessão no período; "simulacoes" conta todas as gravações.
-- SECURITY INVOKER: a leitura passa pela RLS acima, e a função ainda recusa
-- quem não é admin com uma mensagem clara.
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_demanda_busca_por_bairro(_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  bairro text,
  bairro_chave text,
  pessoas bigint,
  simulacoes bigint,
  ultima_simulacao timestamptz,
  valor_mediano numeric,
  metragem_mediana numeric,
  preco_m2_mediano numeric,
  entrada_pct_mediana numeric,
  pct_fgts numeric,
  pct_mcmv numeric,
  prazo_compra jsonb,
  faixa_renda jsonb,
  empreendimentos jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito à Bewild (papel admin).' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT s.* FROM public.simulacoes_busca s
    WHERE _desde IS NULL OR s.created_at >= _desde
  ),
  ultimas AS (
    SELECT DISTINCT ON (b.sessao) b.*
    FROM base b
    ORDER BY b.sessao, b.created_at DESC
  ),
  contagem AS (
    SELECT coalesce(b.bairro_chave, '') AS chave, count(*) AS n
    FROM base b
    GROUP BY 1
  ),
  grupos AS (
    SELECT
      coalesce(u.bairro_chave, '') AS chave,
      coalesce(mode() WITHIN GROUP (ORDER BY btrim(u.bairro)), 'Bairro não informado') AS nome,
      count(*) AS pessoas,
      max(u.created_at) AS ultima,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY u.valor_imovel) AS valor_med,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY u.metragem) AS metragem_med,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY u.preco_m2) AS preco_m2_med,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY u.entrada_pct) AS entrada_med,
      100.0 * avg(CASE WHEN u.usa_fgts THEN 1 ELSE 0 END) AS fgts,
      100.0 * avg(CASE WHEN u.elegivel_mcmv THEN 1 ELSE 0 END) AS mcmv
    FROM ultimas u
    GROUP BY 1
  )
  SELECT
    g.nome,
    g.chave,
    g.pessoas,
    coalesce((SELECT c.n FROM contagem c WHERE c.chave = g.chave), 0),
    g.ultima,
    round(g.valor_med::numeric, 0),
    round(g.metragem_med::numeric, 1),
    round(g.preco_m2_med::numeric, 0),
    round(g.entrada_med::numeric, 1),
    round(g.fgts, 1),
    round(g.mcmv, 1),
    coalesce((
      SELECT jsonb_object_agg(t.k, t.n) FROM (
        SELECT coalesce(u.prazo_compra, 'nao_informado') AS k, count(*) AS n
        FROM ultimas u WHERE coalesce(u.bairro_chave, '') = g.chave GROUP BY 1
      ) t
    ), '{}'::jsonb),
    coalesce((
      SELECT jsonb_object_agg(t.k, t.n) FROM (
        SELECT coalesce(u.faixa_renda, 'nao_informado') AS k, count(*) AS n
        FROM ultimas u WHERE coalesce(u.bairro_chave, '') = g.chave GROUP BY 1
      ) t
    ), '{}'::jsonb),
    coalesce((
      SELECT jsonb_agg(jsonb_build_object('nome', t.nome, 'pessoas', t.n) ORDER BY t.n DESC, t.nome)
      FROM (
        SELECT mode() WITHIN GROUP (ORDER BY btrim(u.empreendimento)) AS nome, count(*) AS n
        FROM ultimas u
        WHERE coalesce(u.bairro_chave, '') = g.chave
          AND u.empreendimento IS NOT NULL AND btrim(u.empreendimento) <> ''
        GROUP BY lower(btrim(u.empreendimento))
        ORDER BY count(*) DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  FROM grupos g
  ORDER BY g.pessoas DESC, g.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_demanda_busca_por_bairro(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_demanda_busca_por_bairro(timestamptz) TO authenticated;
