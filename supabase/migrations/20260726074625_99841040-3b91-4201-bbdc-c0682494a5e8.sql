DROP FUNCTION IF EXISTS public.crm_dashboard(date, date);

CREATE OR REPLACE FUNCTION public.crm_dashboard(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _broker_id uuid DEFAULT NULL,
  _area_m2 numeric DEFAULT NULL,
  _stage_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f date := COALESCE(_from, (now() - interval '180 days')::date);
  t date := COALESCE(_to, (now() + interval '1 day')::date);
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  WITH d AS (
    SELECT dl.*, s.label AS stage_label, s.kind AS stage_kind, s.position AS stage_position
    FROM public.crm_deals dl
    JOIN public.crm_stages s ON s.id = dl.stage_id
    WHERE dl.created_at::date >= f AND dl.created_at::date < t
      AND (_broker_id IS NULL OR dl.broker_id = _broker_id)
      AND (_stage_id IS NULL OR dl.stage_id = _stage_id)
      AND (_area_m2 IS NULL OR EXISTS (
        SELECT 1 FROM public.crm_deal_units du
        JOIN public.units u ON u.id = du.unit_id
        WHERE du.deal_id = dl.id AND u.area_m2 = _area_m2))
  ),
  funil AS (
    SELECT jsonb_agg(x ORDER BY (x->>'position')::int) AS j FROM (
      SELECT jsonb_build_object(
        'stage_id', s.id, 'label', s.label, 'kind', s.kind, 'position', s.position,
        'deals', COALESCE(count(d.id),0), 'value_brl', COALESCE(sum(d.value_brl),0)
      ) AS x
      FROM public.crm_stages s LEFT JOIN d ON d.stage_id = s.id
      GROUP BY s.id, s.label, s.kind, s.position
    ) q
  ),
  totais AS (
    SELECT jsonb_build_object(
      'deals_total',   count(*),
      'deals_abertos', count(*) FILTER (WHERE stage_kind = 'aberto'),
      'deals_ganhos',  count(*) FILTER (WHERE stage_kind = 'ganho'),
      'deals_perdidos',count(*) FILTER (WHERE stage_kind = 'perdido'),
      'vgv_aberto',    COALESCE(sum(value_brl) FILTER (WHERE stage_kind = 'aberto'),0),
      'vgv_ganho',     COALESCE(sum(value_brl) FILTER (WHERE stage_kind = 'ganho'),0),
      'vgv_perdido',   COALESCE(sum(value_brl) FILTER (WHERE stage_kind = 'perdido'),0),
      'ticket_medio',  COALESCE(avg(value_brl) FILTER (WHERE value_brl > 0),0),
      'taxa_conversao', CASE WHEN count(*) FILTER (WHERE stage_kind IN ('ganho','perdido')) > 0
                            THEN round(100.0 * count(*) FILTER (WHERE stage_kind='ganho')
                                 / count(*) FILTER (WHERE stage_kind IN ('ganho','perdido')), 1)
                            ELSE 0 END
    ) AS j FROM d
  ),
  ev AS (
    SELECT e.deal_id, e.to_stage_id, e.changed_at,
           lead(e.changed_at) OVER (PARTITION BY e.deal_id ORDER BY e.changed_at) AS next_at
    FROM public.crm_stage_events e
    WHERE e.deal_id IN (SELECT id FROM d)
  ),
  tempo AS (
    SELECT jsonb_agg(x ORDER BY (x->>'position')::int) AS j FROM (
      SELECT jsonb_build_object(
        'stage_id', s.id, 'label', s.label, 'position', s.position,
        'dias_medio', COALESCE(round(avg(EXTRACT(epoch FROM (COALESCE(ev.next_at, now()) - ev.changed_at))/86400)::numeric, 1), 0),
        'amostras', count(ev.deal_id)
      ) AS x
      FROM public.crm_stages s LEFT JOIN ev ON ev.to_stage_id = s.id
      GROUP BY s.id, s.label, s.position
    ) q
  ),
  perdas AS (
    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'deals')::int DESC), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'motivo', COALESCE(lr.label, NULLIF(d.lost_reason,''), 'Não informado'),
        'deals', count(*), 'value_brl', COALESCE(sum(d.value_brl),0)
      ) AS x
      FROM d LEFT JOIN public.crm_loss_reasons lr ON lr.id = d.loss_reason_id
      WHERE d.stage_kind = 'perdido'
      GROUP BY COALESCE(lr.label, NULLIF(d.lost_reason,''), 'Não informado')
    ) q
  ),
  origens AS (
    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'deals')::int DESC), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'origem', COALESCE(p.source::text,'não informada'),
        'deals', count(*),
        'ganhos', count(*) FILTER (WHERE d.stage_kind='ganho'),
        'value_brl', COALESCE(sum(d.value_brl),0)
      ) AS x
      FROM d JOIN public.crm_people p ON p.id = d.person_id
      GROUP BY COALESCE(p.source::text,'não informada')
    ) q
  ),
  corretores AS (
    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'value_brl')::numeric DESC), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'broker_id', b.id, 'corretor', b.full_name, 'equipe', b.team,
        'deals', count(d.id),
        'ganhos', count(d.id) FILTER (WHERE d.stage_kind='ganho'),
        'value_brl', COALESCE(sum(d.value_brl),0)
      ) AS x
      FROM public.crm_brokers b LEFT JOIN d ON d.broker_id = b.id
      WHERE b.is_active AND (_broker_id IS NULL OR b.id = _broker_id)
      GROUP BY b.id, b.full_name, b.team
    ) q
  ),
  tarefas AS (
    SELECT jsonb_build_object(
      'abertas', count(*) FILTER (WHERE NOT done),
      'atrasadas', count(*) FILTER (WHERE NOT done AND due_date < current_date),
      'hoje', count(*) FILTER (WHERE NOT done AND due_date = current_date),
      'concluidas', count(*) FILTER (WHERE done)
    ) AS j FROM public.crm_tasks tk WHERE tk.deal_id IN (SELECT id FROM d)
  ),
  estoque AS (
    SELECT jsonb_build_object(
      'total', count(*),
      'disponivel', count(*) FILTER (WHERE mirror_status='disponivel'),
      'negociacao', count(*) FILTER (WHERE mirror_status='negociacao'),
      'proposta',   count(*) FILTER (WHERE mirror_status='proposta'),
      'reservado',  count(*) FILTER (WHERE mirror_status='reservado'),
      'vendido',    count(*) FILTER (WHERE mirror_status='vendido'),
      'vgv_total',  COALESCE(sum(price_brl),0),
      'vgv_vendido',COALESCE(sum(price_brl) FILTER (WHERE mirror_status='vendido'),0)
    ) AS j FROM public.crm_sales_mirror
    WHERE (_area_m2 IS NULL OR area_m2 = _area_m2)
  ),
  credito AS (
    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object('status', status::text, 'qtd', count(*),
                                'aprovado_brl', COALESCE(sum(approved_amount_brl),0)) AS x
      FROM public.crm_credit_checks cc
      WHERE cc.deal_id IN (SELECT id FROM d)
      GROUP BY status
    ) q
  ),
  comissoes AS (
    SELECT jsonb_build_object(
      'prevista_brl', COALESCE(sum(total_brl) FILTER (WHERE status='prevista'),0),
      'a_pagar_brl',  COALESCE(sum(total_brl) FILTER (WHERE status='a_pagar'),0),
      'paga_brl',     COALESCE(sum(total_brl) FILTER (WHERE status='paga'),0)
    ) AS j FROM public.crm_commissions cm WHERE cm.deal_id IN (SELECT id FROM d)
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('de', f, 'ate', t),
    'totais', (SELECT j FROM totais),
    'funil', (SELECT j FROM funil),
    'tempo_por_etapa', (SELECT j FROM tempo),
    'motivos_perda', (SELECT j FROM perdas),
    'por_origem', (SELECT j FROM origens),
    'por_corretor', (SELECT j FROM corretores),
    'tarefas', (SELECT j FROM tarefas),
    'estoque', (SELECT j FROM estoque),
    'credito', (SELECT j FROM credito),
    'comissoes', (SELECT j FROM comissoes)
  ) INTO result;

  RETURN result;
END; $function$;

GRANT EXECUTE ON FUNCTION public.crm_dashboard(date, date, uuid, numeric, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_dashboard_advanced(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _broker_id uuid DEFAULT NULL,
  _area_m2 numeric DEFAULT NULL,
  _stage_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f date := COALESCE(_from, (now() - interval '180 days')::date);
  t date := COALESCE(_to, (now() + interval '1 day')::date);
  len int;
  pf date; pt date;
  q_start date; q_end date; q_label text;
  ciclo_medio numeric; ciclo_mediano numeric; ciclo_n int;
  sla_days int;
  st_row record;
  meses numeric;
  disponiveis_n int; vendidas_n int; vendidas_per int; total_n int;
  vgv_total numeric; vgv_vendido numeric; media_mensal numeric;
  cur_criados int; cur_ganhos int; cur_vgv numeric;
  prv_criados int; prv_ganhos int; prv_vgv numeric;
  v_pond numeric;
  v_vel jsonb; v_tri jsonb; v_cmp jsonb; v_etapas jsonb;
  j_prev jsonb; j_abs jsonb; j_rent jsonb; j_prod jsonb;
  v_tip jsonb; v_and jsonb; v_face jsonb; v_mais jsonb; v_menos jsonb;
  v_props jsonb; v_par jsonb; v_imp jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  len := GREATEST(1, (t - f));
  pf := f - len;
  pt := f;
  q_start := date_trunc('quarter', current_date)::date;
  q_end := (q_start + interval '3 months')::date;
  q_label := extract(quarter from q_start)::int || 'º trimestre de ' || extract(year from q_start)::int;

  SELECT s.* INTO st_row FROM public.crm_settings s LIMIT 1;
  sla_days := COALESCE(st_row.task_sla_days, 3);

  CREATE TEMP TABLE _d ON COMMIT DROP AS
  SELECT dl.id, dl.title, dl.value_brl, dl.updated_at, dl.created_at, dl.stage_id, dl.broker_id,
         dl.expected_close_date, dl.stage_changed_at, dl.person_id,
         s.label AS stage_label, s.kind AS stage_kind, s.position AS stage_position,
         s.win_probability_pct AS prob,
         p.full_name AS pessoa, b.full_name AS corretor,
         jsonb_build_object('tipo','deal','id',dl.id,'titulo',dl.title,'pessoa',p.full_name,
           'corretor',b.full_name,'etapa',s.label,'valor_brl',dl.value_brl,
           'atualizado_em',dl.updated_at) AS j
  FROM public.crm_deals dl
  JOIN public.crm_stages s ON s.id = dl.stage_id
  LEFT JOIN public.crm_people p ON p.id = dl.person_id
  LEFT JOIN public.crm_brokers b ON b.id = dl.broker_id
  WHERE dl.created_at::date >= f AND dl.created_at::date < t
    AND (_broker_id IS NULL OR dl.broker_id = _broker_id)
    AND (_stage_id IS NULL OR dl.stage_id = _stage_id)
    AND (_area_m2 IS NULL OR EXISTS (
      SELECT 1 FROM public.crm_deal_units du
      JOIN public.units u ON u.id = du.unit_id
      WHERE du.deal_id = dl.id AND u.area_m2 = _area_m2));

  CREATE TEMP TABLE _won ON COMMIT DROP AS
  SELECT d.id, d.value_brl, d.broker_id,
    COALESCE((SELECT min(e.changed_at) FROM public.crm_stage_events e
               JOIN public.crm_stages s2 ON s2.id = e.to_stage_id
              WHERE e.deal_id = d.id AND s2.kind = 'ganho'), d.stage_changed_at, d.updated_at) AS won_at,
    COALESCE((SELECT min(e.changed_at) FROM public.crm_stage_events e WHERE e.deal_id = d.id),
             d.created_at) AS start_at
  FROM _d d WHERE d.stage_kind = 'ganho';

  SELECT round(avg(EXTRACT(epoch FROM (won_at - start_at))/86400)::numeric, 1),
         round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (won_at - start_at))/86400)::numeric, 1),
         count(*)
    INTO ciclo_medio, ciclo_mediano, ciclo_n
    FROM _won WHERE won_at IS NOT NULL AND won_at >= start_at;

  -- previsão por etapa
  SELECT COALESCE(jsonb_agg(x ORDER BY pos), '[]'::jsonb),
         COALESCE(sum(vp), 0), COALESCE(sum(vt), 0)
    INTO v_etapas, v_pond, cur_vgv
  FROM (
    SELECT s.position AS pos,
           round(COALESCE(sum(d.value_brl),0) * s.win_probability_pct / 100.0, 2) AS vp,
           COALESCE(sum(d.value_brl),0) AS vt,
           jsonb_build_object(
             'stage_id', s.id, 'label', s.label, 'position', s.position,
             'prob_pct', s.win_probability_pct,
             'deals', count(d.id),
             'valor_brl', COALESCE(sum(d.value_brl),0),
             'valor_ponderado_brl', round(COALESCE(sum(d.value_brl),0) * s.win_probability_pct / 100.0, 2),
             'itens_total', count(d.id),
             'itens', (SELECT COALESCE(jsonb_agg(y.j), '[]'::jsonb) FROM (
                 SELECT d2.j FROM _d d2 WHERE d2.stage_id = s.id
                 ORDER BY d2.value_brl DESC NULLS LAST LIMIT 50) y)
           ) AS x
    FROM public.crm_stages s LEFT JOIN _d d ON d.stage_id = s.id
    WHERE s.kind = 'aberto'
    GROUP BY s.id, s.label, s.position, s.win_probability_pct
  ) q;

  -- velocidade
  WITH ev AS (
    SELECT e.deal_id, e.to_stage_id, e.changed_at,
           lead(e.changed_at) OVER (PARTITION BY e.deal_id ORDER BY e.changed_at) AS next_at
    FROM public.crm_stage_events e
    WHERE e.deal_id IN (SELECT id FROM _d)
  )
  SELECT jsonb_build_object(
    'por_etapa', COALESCE(jsonb_agg(x ORDER BY pos), '[]'::jsonb),
    'ciclo_medio_dias', ciclo_medio,
    'ciclo_mediano_dias', ciclo_mediano,
    'amostras', ciclo_n
  ) INTO v_vel
  FROM (
    SELECT s.position AS pos, jsonb_build_object(
      'stage_id', s.id, 'label', s.label, 'position', s.position,
      'dias_medio', COALESCE(round(avg(EXTRACT(epoch FROM (COALESCE(ev.next_at, now()) - ev.changed_at))/86400)::numeric, 1), 0),
      'amostras', count(ev.deal_id)
    ) AS x
    FROM public.crm_stages s LEFT JOIN ev ON ev.to_stage_id = s.id
    GROUP BY s.id, s.label, s.position
  ) q;

  -- trimestre
  SELECT jsonb_build_object(
    'rotulo', q_label,
    'ganho_brl', COALESCE(sum(w.value_brl) FILTER (WHERE w.won_at >= q_start AND w.won_at < q_end), 0),
    'ganho_unid', count(*) FILTER (WHERE w.won_at >= q_start AND w.won_at < q_end)
  ) INTO v_tri FROM _won w;

  SELECT COALESCE(round(sum(d.value_brl * d.prob / 100.0), 2), 0) INTO v_pond
  FROM _d d
  WHERE d.stage_kind = 'aberto'
    AND COALESCE(d.expected_close_date,
        (COALESCE(d.stage_changed_at, d.created_at) + (COALESCE(ciclo_medio, 30) || ' days')::interval)::date) >= q_start
    AND COALESCE(d.expected_close_date,
        (COALESCE(d.stage_changed_at, d.created_at) + (COALESCE(ciclo_medio, 30) || ' days')::interval)::date) < q_end;

  v_tri := v_tri || jsonb_build_object(
    'ponderado_a_fechar_brl', v_pond,
    'projecao_brl', round((v_tri->>'ganho_brl')::numeric + v_pond, 2));

  -- comparativo com o período anterior
  SELECT count(*), count(*) FILTER (WHERE stage_kind = 'ganho'),
         COALESCE(sum(value_brl) FILTER (WHERE stage_kind = 'ganho'), 0)
    INTO cur_criados, cur_ganhos, cur_vgv FROM _d;

  SELECT count(*), count(*) FILTER (WHERE s.kind = 'ganho'),
         COALESCE(sum(dl.value_brl) FILTER (WHERE s.kind = 'ganho'), 0)
    INTO prv_criados, prv_ganhos, prv_vgv
  FROM public.crm_deals dl
  JOIN public.crm_stages s ON s.id = dl.stage_id
  WHERE dl.created_at::date >= pf AND dl.created_at::date < pt
    AND (_broker_id IS NULL OR dl.broker_id = _broker_id)
    AND (_stage_id IS NULL OR dl.stage_id = _stage_id)
    AND (_area_m2 IS NULL OR EXISTS (
      SELECT 1 FROM public.crm_deal_units du
      JOIN public.units u ON u.id = du.unit_id
      WHERE du.deal_id = dl.id AND u.area_m2 = _area_m2));

  v_cmp := jsonb_build_object(
    'periodo_anterior', jsonb_build_object('de', pf, 'ate', pt),
    'deals_criados', cur_criados,
    'deals_criados_anterior', prv_criados,
    'deals_criados_var_pct', CASE WHEN prv_criados > 0 THEN round(100.0 * (cur_criados - prv_criados) / prv_criados, 1) ELSE NULL END,
    'deals_ganhos', cur_ganhos,
    'deals_ganhos_anterior', prv_ganhos,
    'deals_ganhos_var_pct', CASE WHEN prv_ganhos > 0 THEN round(100.0 * (cur_ganhos - prv_ganhos) / prv_ganhos, 1) ELSE NULL END,
    'vgv_ganho_brl', cur_vgv,
    'vgv_ganho_anterior_brl', prv_vgv,
    'vgv_ganho_var_pct', CASE WHEN prv_vgv > 0 THEN round(100.0 * (cur_vgv - prv_vgv) / prv_vgv, 1) ELSE NULL END
  );

  SELECT COALESCE(sum((x->>'valor_ponderado_brl')::numeric), 0),
         COALESCE(sum((x->>'valor_brl')::numeric), 0)
    INTO v_pond, cur_vgv
  FROM jsonb_array_elements(v_etapas) x;

  j_prev := jsonb_build_object(
    'por_etapa', v_etapas,
    'total_ponderado_brl', v_pond,
    'total_aberto_brl', cur_vgv,
    'velocidade', v_vel,
    'trimestre', v_tri,
    'comparativo', v_cmp
  );

  -- ============ absorção ============
  CREATE TEMP TABLE _m ON COMMIT DROP AS
  SELECT sm.unit_id, sm.code, u.area_m2, sm.floor_no, sm.col_no, u.price_brl,
         sm.unit_status, sm.mirror_status, sm.interested_count, sm.proposals_count,
         sm.best_proposal_brl,
         jsonb_build_object('tipo','unit','id',sm.unit_id,'code',sm.code,'area_m2',u.area_m2,
           'andar',sm.floor_no,'face',sm.col_no,'price_brl',u.price_brl,
           'status',sm.mirror_status,'interessados',sm.interested_count) AS j
  FROM public.crm_sales_mirror sm
  JOIN public.units u ON u.id = sm.unit_id
  WHERE (_area_m2 IS NULL OR u.area_m2 = _area_m2);

  SELECT count(*), count(*) FILTER (WHERE mirror_status = 'disponivel'),
         count(*) FILTER (WHERE mirror_status = 'vendido'),
         COALESCE(sum(price_brl), 0),
         COALESCE(sum(price_brl) FILTER (WHERE mirror_status = 'vendido'), 0)
    INTO total_n, disponiveis_n, vendidas_n, vgv_total, vgv_vendido FROM _m;

  SELECT count(DISTINCT du.unit_id) INTO vendidas_per
  FROM public.crm_deal_units du
  JOIN _d d ON d.id = du.deal_id
  WHERE d.stage_kind = 'ganho'
    AND du.unit_id IN (SELECT unit_id FROM _m);

  meses := GREATEST(1, round(len / 30.0, 2));
  media_mensal := round(vendidas_per / meses, 2);

  SELECT COALESCE(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_tip FROM (
    SELECT m.area_m2 AS ord, jsonb_build_object(
      'area_m2', m.area_m2,
      'rotulo', replace(to_char(m.area_m2, 'FM999990.0'), '.', ',') || ' m²',
      'total', count(*),
      'vendidas', count(*) FILTER (WHERE m.mirror_status = 'vendido'),
      'disponiveis', count(*) FILTER (WHERE m.mirror_status = 'disponivel'),
      'vso_pct', CASE WHEN count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE m.mirror_status = 'vendido')
             / count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')), 1) ELSE NULL END,
      'preco_medio_brl', COALESCE(round(avg(m.price_brl), 2), 0),
      'interessados', COALESCE(sum(m.interested_count), 0),
      'propostas', COALESCE(sum(m.proposals_count), 0),
      'itens_total', count(*),
      'itens', (SELECT COALESCE(jsonb_agg(y.j), '[]'::jsonb) FROM (
          SELECT m2.j FROM _m m2 WHERE m2.area_m2 = m.area_m2 ORDER BY m2.code LIMIT 50) y)
    ) AS x
    FROM _m m GROUP BY m.area_m2
  ) q;

  SELECT COALESCE(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_and FROM (
    SELECT m.floor_no AS ord, jsonb_build_object(
      'andar', m.floor_no,
      'rotulo', COALESCE(m.floor_no::text || 'º andar', 'Sem andar'),
      'total', count(*),
      'vendidas', count(*) FILTER (WHERE m.mirror_status = 'vendido'),
      'disponiveis', count(*) FILTER (WHERE m.mirror_status = 'disponivel'),
      'vso_pct', CASE WHEN count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE m.mirror_status = 'vendido')
             / count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')), 1) ELSE NULL END,
      'preco_medio_brl', COALESCE(round(avg(m.price_brl), 2), 0),
      'interessados', COALESCE(sum(m.interested_count), 0),
      'propostas', COALESCE(sum(m.proposals_count), 0),
      'itens_total', count(*),
      'itens', (SELECT COALESCE(jsonb_agg(y.j), '[]'::jsonb) FROM (
          SELECT m2.j FROM _m m2 WHERE m2.floor_no IS NOT DISTINCT FROM m.floor_no
          ORDER BY m2.code LIMIT 50) y)
    ) AS x
    FROM _m m GROUP BY m.floor_no
  ) q;

  SELECT COALESCE(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_face FROM (
    SELECT m.col_no AS ord, jsonb_build_object(
      'face', m.col_no,
      'rotulo', COALESCE('Face ' || m.col_no, 'Sem face'),
      'total', count(*),
      'vendidas', count(*) FILTER (WHERE m.mirror_status = 'vendido'),
      'disponiveis', count(*) FILTER (WHERE m.mirror_status = 'disponivel'),
      'vso_pct', CASE WHEN count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE m.mirror_status = 'vendido')
             / count(*) FILTER (WHERE m.mirror_status IN ('vendido','disponivel')), 1) ELSE NULL END,
      'preco_medio_brl', COALESCE(round(avg(m.price_brl), 2), 0),
      'interessados', COALESCE(sum(m.interested_count), 0),
      'propostas', COALESCE(sum(m.proposals_count), 0),
      'itens_total', count(*),
      'itens', (SELECT COALESCE(jsonb_agg(y.j), '[]'::jsonb) FROM (
          SELECT m2.j FROM _m m2 WHERE m2.col_no IS NOT DISTINCT FROM m.col_no
          ORDER BY m2.code LIMIT 50) y)
    ) AS x
    FROM _m m GROUP BY m.col_no
  ) q;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_mais FROM (
    SELECT jsonb_build_object('unit_id', m.unit_id, 'code', m.code, 'area_m2', m.area_m2,
      'andar', m.floor_no, 'face', m.col_no, 'price_brl', m.price_brl,
      'unit_status', m.mirror_status, 'interested_count', m.interested_count,
      'proposals_count', m.proposals_count, 'best_proposal_brl', m.best_proposal_brl) AS x
    FROM _m m ORDER BY m.interested_count DESC, m.proposals_count DESC, m.code LIMIT 8
  ) q;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_menos FROM (
    SELECT jsonb_build_object('unit_id', m.unit_id, 'code', m.code, 'area_m2', m.area_m2,
      'andar', m.floor_no, 'face', m.col_no, 'price_brl', m.price_brl,
      'unit_status', m.mirror_status, 'interested_count', m.interested_count,
      'proposals_count', m.proposals_count, 'best_proposal_brl', m.best_proposal_brl) AS x
    FROM _m m WHERE m.mirror_status = 'disponivel'
    ORDER BY m.interested_count ASC, m.proposals_count ASC, m.code LIMIT 8
  ) q;

  j_abs := jsonb_build_object(
    'resumo', jsonb_build_object(
      'total_unidades', total_n,
      'disponiveis', disponiveis_n,
      'vendidas', vendidas_n,
      'vendidas_periodo', vendidas_per,
      'vgv_total_brl', vgv_total,
      'vgv_vendido_brl', vgv_vendido,
      'vso_pct', CASE WHEN (disponiveis_n + vendidas_per) > 0
        THEN round(100.0 * vendidas_per / (disponiveis_n + vendidas_per), 1) ELSE NULL END,
      'vendas_media_mensal', media_mensal,
      'meses_de_estoque', CASE WHEN media_mensal > 0
        THEN round(disponiveis_n / media_mensal, 1) ELSE NULL END
    ),
    'por_tipologia', v_tip,
    'por_andar', v_and,
    'por_face', v_face,
    'ranking', jsonb_build_object('mais_procuradas', v_mais, 'menos_procuradas', v_menos)
  );

  -- ============ rentabilidade ============
  SELECT COALESCE(jsonb_agg(x ORDER BY ord DESC), '[]'::jsonb) INTO v_props FROM (
    SELECT pr.created_at AS ord, jsonb_build_object(
      'id', pr.id, 'deal_id', pr.deal_id, 'titulo_negocio', d.title,
      'unit_id', pr.unit_id, 'unit_code', u.code, 'area_m2', u.area_m2,
      'corretor', d.corretor, 'etapa', d.stage_label, 'status', pr.status,
      'created_at', pr.created_at,
      'list_price_brl', pr.list_price_brl, 'discount_pct', pr.discount_pct,
      'discount_brl', pr.discount_brl, 'final_price_brl', pr.final_price_brl,
      'payment_method', pr.payment_method, 'down_payment_brl', pr.down_payment_brl,
      'monthly_count', pr.monthly_count, 'monthly_brl', pr.monthly_brl,
      'balloon_count', pr.balloon_count, 'balloon_brl', pr.balloon_brl,
      'keys_brl', pr.keys_brl
    ) AS x
    FROM public.crm_proposals pr
    JOIN _d d ON d.id = pr.deal_id
    JOIN public.units u ON u.id = pr.unit_id
    WHERE (_area_m2 IS NULL OR u.area_m2 = _area_m2)
  ) q;

  SELECT jsonb_build_object(
    'vgv_tabela_brl', COALESCE(sum((x->>'list_price_brl')::numeric), 0),
    'vgv_proposto_brl', COALESCE(sum((x->>'final_price_brl')::numeric), 0),
    'desconto_nominal_brl', COALESCE(sum((x->>'list_price_brl')::numeric - (x->>'final_price_brl')::numeric), 0)
  ) INTO v_imp FROM jsonb_array_elements(v_props) x;

  v_par := jsonb_build_object(
    'vpl_monthly_rate', COALESCE(st_row.vpl_monthly_rate, 0.008),
    'vpl_correct_by_incc', COALESCE(st_row.vpl_correct_by_incc, true),
    'proposal_incc_monthly', COALESCE(st_row.proposal_incc_monthly, 0.0045),
    'proposal_balloon_every_months', COALESCE(st_row.proposal_balloon_every_months, 6)
  );

  j_rent := jsonb_build_object('propostas', v_props, 'parametros', v_par, 'impacto', v_imp);

  -- ============ produtividade ============
  WITH resp AS (
    SELECT d.broker_id, d.created_at,
      LEAST(
        COALESCE((SELECT min(e.changed_at) FROM public.crm_stage_events e WHERE e.deal_id = d.id), 'infinity'::timestamptz),
        COALESCE((SELECT min(tk.done_at) FROM public.crm_tasks tk WHERE tk.deal_id = d.id AND tk.done), 'infinity'::timestamptz)
      ) AS first_at
    FROM _d d
  ), respv AS (
    SELECT broker_id, EXTRACT(epoch FROM (first_at - created_at))/3600 AS horas
    FROM resp WHERE first_at <> 'infinity'::timestamptz
  )
  SELECT COALESCE(jsonb_agg(x ORDER BY ord DESC NULLS LAST), '[]'::jsonb) INTO j_prod FROM (
    SELECT COALESCE(sum(d.value_brl) FILTER (WHERE d.stage_kind = 'ganho'), 0) AS ord,
    jsonb_build_object(
      'broker_id', b.id, 'corretor', b.full_name, 'equipe', b.team,
      'in_rotation', b.in_rotation, 'weight', b.weight,
      'assigned_count', b.assigned_count, 'last_assigned_at', b.last_assigned_at,
      'deals_total', count(d.id),
      'deals_abertos', count(d.id) FILTER (WHERE d.stage_kind = 'aberto'),
      'deals_ganhos', count(d.id) FILTER (WHERE d.stage_kind = 'ganho'),
      'deals_perdidos', count(d.id) FILTER (WHERE d.stage_kind = 'perdido'),
      'vgv_aberto_brl', COALESCE(sum(d.value_brl) FILTER (WHERE d.stage_kind = 'aberto'), 0),
      'vgv_ganho_brl', COALESCE(sum(d.value_brl) FILTER (WHERE d.stage_kind = 'ganho'), 0),
      'taxa_conversao_pct', CASE WHEN count(d.id) FILTER (WHERE d.stage_kind IN ('ganho','perdido')) > 0
        THEN round(100.0 * count(d.id) FILTER (WHERE d.stage_kind = 'ganho')
             / count(d.id) FILTER (WHERE d.stage_kind IN ('ganho','perdido')), 1) ELSE NULL END,
      'ticket_medio_brl', COALESCE(round(avg(d.value_brl) FILTER (WHERE d.value_brl > 0), 2), 0),
      'primeira_resposta_horas', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY r.horas)::numeric, 1)
                                    FROM respv r WHERE r.broker_id = b.id),
      'tarefas_abertas', (SELECT count(*) FROM public.crm_tasks tk
                           WHERE NOT tk.done AND (tk.broker_id = b.id
                             OR tk.deal_id IN (SELECT d2.id FROM _d d2 WHERE d2.broker_id = b.id))),
      'tarefas_atrasadas', (SELECT count(*) FROM public.crm_tasks tk
                             WHERE NOT tk.done AND tk.due_date < current_date AND (tk.broker_id = b.id
                               OR tk.deal_id IN (SELECT d2.id FROM _d d2 WHERE d2.broker_id = b.id))),
      'sla_cumprido_pct', (SELECT CASE WHEN count(*) > 0
            THEN round(100.0 * count(*) FILTER (WHERE tk.done_at::date - tk.created_at::date <= sla_days) / count(*), 1)
            ELSE NULL END
          FROM public.crm_tasks tk
          WHERE tk.done AND tk.done_at IS NOT NULL AND (tk.broker_id = b.id
            OR tk.deal_id IN (SELECT d2.id FROM _d d2 WHERE d2.broker_id = b.id))),
      'funil', (SELECT COALESCE(jsonb_agg(jsonb_build_object('stage_id', s2.id, 'label', s2.label,
                    'deals', (SELECT count(*) FROM _d d3 WHERE d3.broker_id = b.id AND d3.stage_id = s2.id))
                  ORDER BY s2.position), '[]'::jsonb)
                FROM public.crm_stages s2),
      'itens_total', count(d.id),
      'itens', (SELECT COALESCE(jsonb_agg(y.j), '[]'::jsonb) FROM (
          SELECT d4.j FROM _d d4 WHERE d4.broker_id = b.id
          ORDER BY d4.value_brl DESC NULLS LAST LIMIT 50) y)
    ) AS x
    FROM public.crm_brokers b
    LEFT JOIN _d d ON d.broker_id = b.id
    WHERE b.is_active AND (_broker_id IS NULL OR b.id = _broker_id)
    GROUP BY b.id, b.full_name, b.team, b.in_rotation, b.weight, b.assigned_count, b.last_assigned_at
  ) q;

  RETURN jsonb_build_object(
    'periodo', jsonb_build_object('de', f, 'ate', t),
    'previsao', j_prev,
    'absorcao', j_abs,
    'rentabilidade', j_rent,
    'produtividade', j_prod
  );
END; $function$;

REVOKE ALL ON FUNCTION public.crm_dashboard_advanced(date, date, uuid, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_dashboard_advanced(date, date, uuid, numeric, uuid) TO authenticated;