
-- Helper: is_staff => admin OR incorporadora
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','incorporadora')
  )
$$;

-- units: admin+incorporadora write
DROP POLICY IF EXISTS "Admins insert units" ON public.units;
DROP POLICY IF EXISTS "Admins update units" ON public.units;
DROP POLICY IF EXISTS "Admins delete units" ON public.units;
CREATE POLICY "Staff insert units" ON public.units FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update units" ON public.units FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete units" ON public.units FOR DELETE USING (public.is_staff(auth.uid()));

-- custom_field_values: admin+incorporadora write
DROP POLICY IF EXISTS "Admins insert field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Admins update field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Admins delete field values" ON public.custom_field_values;
CREATE POLICY "Staff insert field values" ON public.custom_field_values FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update field values" ON public.custom_field_values FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete field values" ON public.custom_field_values FOR DELETE USING (public.is_staff(auth.uid()));

-- custom_field_definitions: admin-only writes remain; add explicit staff read (already public)
-- (no change needed for definitions writes)

-- contracts: admin+incorporadora SELECT/INSERT/UPDATE; DELETE admin-only
DROP POLICY IF EXISTS "Admins can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can update contracts" ON public.contracts;
CREATE POLICY "Staff view contracts" ON public.contracts FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert contracts" ON public.contracts FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update contracts" ON public.contracts FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- contract_installments: admin+incorporadora SELECT/INSERT/UPDATE; DELETE admin-only
DROP POLICY IF EXISTS "Admins can view installments" ON public.contract_installments;
DROP POLICY IF EXISTS "Admins can insert installments" ON public.contract_installments;
DROP POLICY IF EXISTS "Admins can update installments" ON public.contract_installments;
CREATE POLICY "Staff view installments" ON public.contract_installments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert installments" ON public.contract_installments FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update installments" ON public.contract_installments FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
