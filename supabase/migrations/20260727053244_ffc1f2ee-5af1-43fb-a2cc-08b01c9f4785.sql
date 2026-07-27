DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_deal_purpose') THEN
    CREATE TYPE public.crm_deal_purpose AS ENUM ('short_stay','long_stay','moradia');
  END IF;
END $$;

ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS finalidade public.crm_deal_purpose;

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS bairro text DEFAULT 'Vila Mariana';
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'São Paulo';
UPDATE public.units SET bairro = COALESCE(bairro, 'Vila Mariana'), cidade = COALESCE(cidade, 'São Paulo');

CREATE TABLE IF NOT EXISTS public.market_neighborhood_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bairro text NOT NULL,
  cidade text NOT NULL DEFAULT 'São Paulo',
  ocupacao_media_pct numeric,
  adr_medio_brl numeric,
  anuncios_ativos integer,
  anuncios_studio_1q integer,
  preco_m2_brl numeric,
  aluguel_mensal_brl numeric,
  area_media_m2 numeric,
  vacancia_media_dias integer,
  valorizacao_12m_pct numeric,
  dias_medio_venda integer,
  fonte text NOT NULL DEFAULT 'AirDNA',
  data_referencia date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bairro, cidade)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_neighborhood_metrics TO authenticated;
GRANT ALL ON public.market_neighborhood_metrics TO service_role;
ALTER TABLE public.market_neighborhood_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mnm_select_auth" ON public.market_neighborhood_metrics;
CREATE POLICY "mnm_select_auth" ON public.market_neighborhood_metrics
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mnm_write_admin" ON public.market_neighborhood_metrics;
CREATE POLICY "mnm_write_admin" ON public.market_neighborhood_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS mnm_set_updated_at ON public.market_neighborhood_metrics;
CREATE TRIGGER mnm_set_updated_at BEFORE UPDATE ON public.market_neighborhood_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.market_neighborhood_metrics
  (bairro, cidade, ocupacao_media_pct, adr_medio_brl, anuncios_ativos, anuncios_studio_1q,
   preco_m2_brl, aluguel_mensal_brl, area_media_m2, dias_medio_venda, fonte, data_referencia)
VALUES
  ('Vila Mariana','São Paulo',80.0,366,420,180,11500,3200,28,120,'AirDNA','2026-03-01'),
  ('Pinheiros','São Paulo',82.0,350,580,250,14000,4200,30,90,'AirDNA','2026-03-01'),
  ('Consolação','São Paulo',76.0,260,350,160,10500,2800,26,130,'AirDNA','2026-03-01'),
  ('Bela Vista','São Paulo',74.0,240,400,200,9800,2500,25,140,'AirDNA','2026-03-01'),
  ('Itaim Bibi','São Paulo',78.0,380,520,220,16000,5000,32,80,'AirDNA','2026-03-01'),
  ('Moema','São Paulo',77.0,300,380,150,13000,3800,29,100,'AirDNA','2026-03-01'),
  ('Brooklin','São Paulo',75.0,290,320,130,12000,3500,27,110,'AirDNA','2026-03-01'),
  ('República','São Paulo',72.0,200,450,280,7500,2000,22,160,'AirDNA','2026-03-01'),
  ('Liberdade','São Paulo',73.0,220,280,120,8500,2300,24,135,'AirDNA','2026-03-01'),
  ('Vila Olímpia','São Paulo',79.0,360,480,200,15000,4600,31,85,'AirDNA','2026-03-01')
ON CONFLICT (bairro, cidade) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.market_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bairro text NOT NULL,
  cidade text NOT NULL DEFAULT 'São Paulo',
  finalidade text NOT NULL DEFAULT 'geral',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bairro, cidade, finalidade)
);

GRANT SELECT ON public.market_insights TO authenticated;
GRANT ALL ON public.market_insights TO service_role;
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mi_select_auth" ON public.market_insights;
CREATE POLICY "mi_select_auth" ON public.market_insights
  FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS mi_set_updated_at ON public.market_insights;
CREATE TRIGGER mi_set_updated_at BEFORE UPDATE ON public.market_insights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();