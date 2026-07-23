
-- =============== contracts ===============
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  contract_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  contract_date date NOT NULL,
  original_value numeric NOT NULL,
  contract_value numeric NOT NULL,
  -- DEMO/PREMISSA: taxa mensal fixa parametrizada por contrato (~INCC-M).
  -- Sistemas reais aplicam a série mensal do índice oficial publicado.
  monthly_index_rate numeric NOT NULL DEFAULT 0.0045,
  index_label text NOT NULL DEFAULT 'INCC-M',
  late_fine_rate numeric NOT NULL DEFAULT 0.02,       -- multa 2%
  late_interest_monthly numeric NOT NULL DEFAULT 0.01, -- mora 1% a.m. pro-rata
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== contract_installments ===============
CREATE TABLE public.contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  seq_label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sinal','mensal','intermediaria','chaves')),
  due_date date NOT NULL,
  contractual_value numeric NOT NULL,
  paid_date date NULL,
  paid_value numeric NOT NULL DEFAULT 0,
  fine_value numeric NOT NULL DEFAULT 0,
  interest_value numeric NOT NULL DEFAULT 0,
  discount_value numeric NOT NULL DEFAULT 0,
  admin_fee numeric NOT NULL DEFAULT 0,
  insurance_fee numeric NOT NULL DEFAULT 0,
  corrected_value numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contract_installments_contract_id_idx ON public.contract_installments(contract_id);
CREATE INDEX contract_installments_due_date_idx ON public.contract_installments(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_installments TO authenticated;
GRANT ALL ON public.contract_installments TO service_role;

ALTER TABLE public.contract_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view installments"
  ON public.contract_installments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert installments"
  ON public.contract_installments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update installments"
  ON public.contract_installments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete installments"
  ON public.contract_installments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_contract_installments_updated_at
  BEFORE UPDATE ON public.contract_installments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== SEED DEMO ===============
DO $$
DECLARE
  today date := CURRENT_DATE;
  rate numeric := 0.0045;
  late_fine numeric := 0.02;
  late_mora numeric := 0.01;
  keys_date date := DATE '2026-12-30';

  -- Per-unit config: unit_code, client_name, contract_date, contract_number, monthly_count
  cfg record;
  contracts_cfg text[][] := ARRAY[
    ['102','Ricardo e Marina Almeida','2025-03-15','VP-2025-0001','30'],
    ['201','Fernanda de Souza Lima',   '2025-06-20','VP-2025-0002','28'],
    ['302','Bruno Cavalcanti Pereira', '2025-09-10','VP-2025-0003','26'],
    ['501','Juliana Martins Rocha',    '2025-11-25','VP-2025-0004','24'],
    ['803','Guilherme e Ana Tavares',  '2026-02-14','VP-2026-0005','20'],
    ['901','Patrícia Nogueira Ribeiro','2026-05-05','VP-2026-0006','18']
  ];

  unit_row units%ROWTYPE;
  contract_id uuid;
  v numeric;
  sinal_v numeric;
  monthly_total numeric;
  monthly_each numeric;
  interm_total numeric;
  interm_each numeric;
  chaves_v numeric;
  n_monthly int;
  n_interm int := 3;
  cdate date;
  due date;
  months_frac numeric;
  paid_d date;
  delay_days int;
  cval numeric;
  fine numeric;
  mora numeric;
  paid_val numeric;
  corrected numeric;
  i int;
  monthly_sum_check numeric;
  interm_sum_check numeric;
BEGIN
  FOR idx IN 1..array_length(contracts_cfg,1) LOOP
    SELECT * INTO unit_row FROM public.units WHERE code = contracts_cfg[idx][1] LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;

    v := unit_row.price_brl;
    cdate := contracts_cfg[idx][3]::date;
    n_monthly := contracts_cfg[idx][5]::int;

    sinal_v := ROUND(v * 0.05, 2);
    monthly_total := ROUND(v * 0.15, 2);
    monthly_each := ROUND(monthly_total / n_monthly, 2);
    interm_total := ROUND(v * 0.10, 2);
    interm_each := ROUND(interm_total / n_interm, 2);
    -- ajuste para fechar exato
    chaves_v := v - sinal_v - (monthly_each * n_monthly) - (interm_each * n_interm);

    INSERT INTO public.contracts (
      unit_id, contract_number, client_name, contract_date,
      original_value, contract_value, monthly_index_rate, index_label,
      late_fine_rate, late_interest_monthly, status
    ) VALUES (
      unit_row.id, contracts_cfg[idx][4], contracts_cfg[idx][2], cdate,
      v, v, rate, 'INCC-M', late_fine, late_mora, 'ativo'
    ) RETURNING id INTO contract_id;

    -- SINAL (001/001-S) — pago no ato
    INSERT INTO public.contract_installments (
      contract_id, seq_label, kind, due_date,
      contractual_value, paid_date, paid_value, corrected_value
    ) VALUES (
      contract_id, '001/001-S', 'sinal', cdate,
      sinal_v, cdate, sinal_v, sinal_v
    );

    -- MENSAIS
    FOR i IN 1..n_monthly LOOP
      due := (cdate + (i || ' months')::interval)::date;
      cval := monthly_each;
      months_frac := i;  -- meses desde contrato

      IF due <= today THEN
        -- pago: 2 no meio com atraso, resto em dia
        IF i IN (3, 7) THEN
          delay_days := CASE WHEN i = 3 THEN 5 ELSE 8 END;
          paid_d := due + delay_days;
          corrected := ROUND(cval * power(1+rate, months_frac), 2);
          fine := ROUND(corrected * late_fine, 2);
          mora := ROUND(corrected * late_mora * (delay_days::numeric/30), 2);
          paid_val := corrected + fine + mora;
          INSERT INTO public.contract_installments (
            contract_id, seq_label, kind, due_date, contractual_value,
            paid_date, paid_value, fine_value, interest_value, corrected_value
          ) VALUES (
            contract_id, lpad(i::text,3,'0')||'/'||lpad(n_monthly::text,3,'0')||'-M',
            'mensal', due, cval, paid_d, paid_val, fine, mora, corrected
          );
        ELSE
          paid_d := due;
          corrected := ROUND(cval * power(1+rate, months_frac), 2);
          paid_val := corrected;
          INSERT INTO public.contract_installments (
            contract_id, seq_label, kind, due_date, contractual_value,
            paid_date, paid_value, corrected_value
          ) VALUES (
            contract_id, lpad(i::text,3,'0')||'/'||lpad(n_monthly::text,3,'0')||'-M',
            'mensal', due, cval, paid_d, paid_val, corrected
          );
        END IF;
      ELSE
        INSERT INTO public.contract_installments (
          contract_id, seq_label, kind, due_date, contractual_value
        ) VALUES (
          contract_id, lpad(i::text,3,'0')||'/'||lpad(n_monthly::text,3,'0')||'-M',
          'mensal', due, cval
        );
      END IF;
    END LOOP;

    -- INTERMEDIÁRIAS (3 semestrais)
    FOR i IN 1..n_interm LOOP
      due := (cdate + (i*6 || ' months')::interval)::date;
      cval := interm_each;
      months_frac := i*6;
      IF due <= today THEN
        -- 2ª intermediária com pequeno atraso, demais em dia
        IF i = 2 THEN
          delay_days := 6;
          paid_d := due + delay_days;
          corrected := ROUND(cval * power(1+rate, months_frac), 2);
          fine := ROUND(corrected * late_fine, 2);
          mora := ROUND(corrected * late_mora * (delay_days::numeric/30), 2);
          paid_val := corrected + fine + mora;
          INSERT INTO public.contract_installments (
            contract_id, seq_label, kind, due_date, contractual_value,
            paid_date, paid_value, fine_value, interest_value, corrected_value
          ) VALUES (
            contract_id, lpad(i::text,3,'0')||'/'||lpad(n_interm::text,3,'0')||'-I',
            'intermediaria', due, cval, paid_d, paid_val, fine, mora, corrected
          );
        ELSE
          corrected := ROUND(cval * power(1+rate, months_frac), 2);
          INSERT INTO public.contract_installments (
            contract_id, seq_label, kind, due_date, contractual_value,
            paid_date, paid_value, corrected_value
          ) VALUES (
            contract_id, lpad(i::text,3,'0')||'/'||lpad(n_interm::text,3,'0')||'-I',
            'intermediaria', due, cval, due, corrected, corrected
          );
        END IF;
      ELSE
        INSERT INTO public.contract_installments (
          contract_id, seq_label, kind, due_date, contractual_value
        ) VALUES (
          contract_id, lpad(i::text,3,'0')||'/'||lpad(n_interm::text,3,'0')||'-I',
          'intermediaria', due, cval
        );
      END IF;
    END LOOP;

    -- CHAVES
    INSERT INTO public.contract_installments (
      contract_id, seq_label, kind, due_date, contractual_value
    ) VALUES (
      contract_id, '001/001-C', 'chaves', keys_date, chaves_v
    );

  END LOOP;
END $$;
