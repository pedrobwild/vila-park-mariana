CREATE TABLE public.crm_sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  broker_id uuid NULL REFERENCES public.crm_brokers(id) ON DELETE CASCADE,
  vgv_target_brl numeric(14,2) NOT NULL DEFAULT 0,
  units_target integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_sales_goals_month_day1 CHECK (extract(day from month) = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_sales_goals TO authenticated;
GRANT ALL ON public.crm_sales_goals TO service_role;

ALTER TABLE public.crm_sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff select crm_sales_goals" ON public.crm_sales_goals
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert crm_sales_goals" ON public.crm_sales_goals
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update crm_sales_goals" ON public.crm_sales_goals
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete crm_sales_goals" ON public.crm_sales_goals
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE UNIQUE INDEX crm_sales_goals_team_uq ON public.crm_sales_goals (month) WHERE broker_id IS NULL;
CREATE UNIQUE INDEX crm_sales_goals_broker_uq ON public.crm_sales_goals (month, broker_id) WHERE broker_id IS NOT NULL;
CREATE INDEX crm_sales_goals_month_idx ON public.crm_sales_goals (month);

CREATE TRIGGER set_updated_at_crm_sales_goals
  BEFORE UPDATE ON public.crm_sales_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed idempotente
INSERT INTO public.crm_sales_goals (month, broker_id, vgv_target_brl, units_target)
VALUES ('2026-07-01', NULL, 2000000.00, 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_sales_goals (month, broker_id, vgv_target_brl, units_target)
SELECT '2026-07-01'::date, b.id, v.vgv, v.un
FROM (VALUES ('Camila Ferraz', 700000.00, 2),
             ('Letícia Amorim', 500000.00, 1),
             ('Marcelo Tanaka', 450000.00, 1),
             ('Rodrigo Bastos', 350000.00, 1)) AS v(nome, vgv, un)
JOIN public.crm_brokers b ON b.full_name = v.nome
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_sales_goals (month, broker_id, vgv_target_brl, units_target)
VALUES ('2026-08-01', NULL, 2500000.00, 6)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.crm_goals_report(_month date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  m date;
  prev date;
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  m := date_trunc('month', COALESCE(_month, current_date))::date;
  prev := (m - interval '1 month')::date;

  WITH won AS (
    SELECT d.id, d.broker_id, COALESCE(d.value_brl,0) AS value_brl,
           date_trunc('month', COALESCE(
             (SELECT max(e.changed_at) FROM public.crm_stage_events e
               JOIN public.crm_stages s2 ON s2.id = e.to_stage_id
              WHERE e.deal_id = d.id AND s2.kind = 'ganho'),
             d.stage_changed_at, d.updated_at))::date AS won_month
    FROM public.crm_deals d
    JOIN public.crm_stages s ON s.id = d.stage_id
    WHERE s.kind = 'ganho'
  ),
  dias AS (
    SELECT
      extract(day from (m + interval '1 month' - interval '1 day'))::int AS total,
      GREATEST(LEAST(
        CASE WHEN current_date >= m + interval '1 month' THEN extract(day from (m + interval '1 month' - interval '1 day'))::int
             WHEN current_date < m THEN 0
             ELSE extract(day from current_date)::int END,
        extract(day from (m + interval '1 month' - interval '1 day'))::int), 0) AS decorridos
  ),
  dias2 AS (
    SELECT total, decorridos, (total - decorridos) AS restantes,
      (SELECT count(*) FROM generate_series(
          GREATEST(m, LEAST(current_date + 1, (m + interval '1 month')::date)),
          (m + interval '1 month' - interval '1 day')::date, interval '1 day') g
        WHERE extract(isodow from g) < 6)::int AS uteis_restantes
    FROM dias
  ),
  meta_eq AS (
    SELECT COALESCE(sum(vgv_target_brl),0)::numeric AS vgv, COALESCE(sum(units_target),0)::int AS un
    FROM public.crm_sales_goals WHERE month = m AND broker_id IS NULL
  ),
  real_eq AS (
    SELECT COALESCE(sum(value_brl),0)::numeric AS vgv, count(*)::int AS un
    FROM won WHERE won_month = m
  ),
  real_prev AS (
    SELECT COALESCE(sum(value_brl),0)::numeric AS vgv, count(*)::int AS un
    FROM won WHERE won_month = prev
  ),
  equipe AS (
    SELECT jsonb_build_object(
      'vgv_meta', me.vgv,
      'vgv_realizado', re.vgv,
      'vgv_pct', CASE WHEN me.vgv > 0 THEN round(100.0 * re.vgv / me.vgv, 1) ELSE NULL END,
      'unid_meta', me.un,
      'unid_realizado', re.un,
      'unid_pct', CASE WHEN me.un > 0 THEN round(100.0 * re.un / me.un, 1) ELSE NULL END,
      'vgv_projecao', CASE WHEN d.decorridos > 0 THEN round(re.vgv / d.decorridos * d.total, 2) ELSE 0 END,
      'vgv_falta', GREATEST(me.vgv - re.vgv, 0),
      'ritmo_vgv_dia_util', CASE WHEN me.vgv - re.vgv <= 0 THEN 0
                                 WHEN d.uteis_restantes > 0 THEN round((me.vgv - re.vgv) / d.uteis_restantes, 2)
                                 ELSE NULL END,
      'ritmo_unid_semana', CASE WHEN me.un - re.un <= 0 THEN 0
                                WHEN d.restantes > 0 THEN round((me.un - re.un)::numeric / (d.restantes::numeric / 7.0), 1)
                                ELSE NULL END,
      'vgv_mes_anterior', rp.vgv,
      'unid_mes_anterior', rp.un,
      'vgv_var_pct', CASE WHEN rp.vgv > 0 THEN round(100.0 * (re.vgv - rp.vgv) / rp.vgv, 1) ELSE NULL END
    ) AS j
    FROM meta_eq me, real_eq re, real_prev rp, dias2 d
  ),
  corretores AS (
    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'vgv_realizado')::numeric DESC), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'broker_id', b.id, 'corretor', b.full_name, 'equipe', b.team,
        'vgv_meta', COALESCE(g.vgv_target_brl, 0),
        'vgv_realizado', COALESCE(w.vgv, 0),
        'vgv_pct', CASE WHEN COALESCE(g.vgv_target_brl,0) > 0
                        THEN round(100.0 * COALESCE(w.vgv,0) / g.vgv_target_brl, 1) ELSE NULL END,
        'unid_meta', COALESCE(g.units_target, 0),
        'unid_realizado', COALESCE(w.un, 0),
        'unid_pct', CASE WHEN COALESCE(g.units_target,0) > 0
                         THEN round(100.0 * COALESCE(w.un,0) / g.units_target, 1) ELSE NULL END,
        'deals_ganhos', COALESCE(w.un, 0),
        'deals_abertos', COALESCE(op.qtd, 0),
        'vgv_aberto', COALESCE(op.vgv, 0)
      ) AS x
      FROM public.crm_brokers b
      LEFT JOIN public.crm_sales_goals g ON g.broker_id = b.id AND g.month = m
      LEFT JOIN (
        SELECT broker_id, sum(value_brl)::numeric AS vgv, count(*)::int AS un
        FROM won WHERE won_month = m GROUP BY broker_id
      ) w ON w.broker_id = b.id
      LEFT JOIN (
        SELECT d.broker_id, count(*)::int AS qtd, COALESCE(sum(d.value_brl),0)::numeric AS vgv
        FROM public.crm_deals d JOIN public.crm_stages s ON s.id = d.stage_id
        WHERE s.kind = 'aberto' GROUP BY d.broker_id
      ) op ON op.broker_id = b.id
      WHERE b.is_active
    ) q
  ),
  meses AS (
    SELECT (date_trunc('month', m) - (i || ' month')::interval)::date AS mes
    FROM generate_series(0, 5) i
  ),
  historico AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'mes', mm.mes,
      'vgv_meta', COALESCE((SELECT sum(vgv_target_brl) FROM public.crm_sales_goals g
                             WHERE g.month = mm.mes AND g.broker_id IS NULL), 0),
      'unid_meta', COALESCE((SELECT sum(units_target) FROM public.crm_sales_goals g
                              WHERE g.month = mm.mes AND g.broker_id IS NULL), 0),
      'vgv_realizado', COALESCE((SELECT sum(value_brl) FROM won WHERE won_month = mm.mes), 0),
      'unid_realizado', COALESCE((SELECT count(*) FROM won WHERE won_month = mm.mes), 0)
    ) ORDER BY mm.mes), '[]'::jsonb) AS j
    FROM meses mm
  )
  SELECT jsonb_build_object(
    'mes', m,
    'dias', (SELECT jsonb_build_object('total', total, 'decorridos', decorridos,
                                       'restantes', restantes, 'uteis_restantes', uteis_restantes) FROM dias2),
    'equipe', (SELECT j FROM equipe),
    'por_corretor', (SELECT j FROM corretores),
    'historico', (SELECT j FROM historico)
  ) INTO result;

  RETURN result;
END; $function$;

GRANT EXECUTE ON FUNCTION public.crm_goals_report(date) TO authenticated;