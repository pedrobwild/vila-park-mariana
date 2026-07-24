-- Normalize any existing CPF values to 11 digits (strip punctuation, pad with leading zeros)
UPDATE public.crm_people
SET cpf = lpad(regexp_replace(cpf, '\D', '', 'g'), 11, '0')
WHERE cpf IS NOT NULL
  AND cpf <> lpad(regexp_replace(cpf, '\D', '', 'g'), 11, '0');

-- Enforce format at the DB level: 11 digits, only numerics
ALTER TABLE public.crm_people
  DROP CONSTRAINT IF EXISTS crm_people_cpf_format_chk;
ALTER TABLE public.crm_people
  ADD CONSTRAINT crm_people_cpf_format_chk
  CHECK (cpf IS NULL OR cpf ~ '^\d{11}$');

-- Enforce uniqueness across non-null CPFs (partial unique index)
DROP INDEX IF EXISTS public.crm_people_cpf_unique_idx;
CREATE UNIQUE INDEX crm_people_cpf_unique_idx
  ON public.crm_people (cpf)
  WHERE cpf IS NOT NULL;