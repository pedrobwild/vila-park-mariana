ALTER TABLE public.crm_stages
  ADD COLUMN IF NOT EXISTS win_probability_pct integer NOT NULL DEFAULT 0;

ALTER TABLE public.crm_stages
  DROP CONSTRAINT IF EXISTS crm_stages_win_probability_pct_check;

ALTER TABLE public.crm_stages
  ADD CONSTRAINT crm_stages_win_probability_pct_check
  CHECK (win_probability_pct >= 0 AND win_probability_pct <= 100);

WITH abertas AS (
  SELECT id, row_number() OVER (ORDER BY position) AS rn, count(*) OVER () AS total
  FROM public.crm_stages
  WHERE kind = 'aberto'
)
UPDATE public.crm_stages s
SET win_probability_pct = LEAST(95, GREATEST(5, round(100.0 * a.rn / (a.total + 1))::int))
FROM abertas a
WHERE s.id = a.id;

UPDATE public.crm_stages SET win_probability_pct = 100 WHERE kind = 'ganho';
UPDATE public.crm_stages SET win_probability_pct = 0 WHERE kind = 'perdido';