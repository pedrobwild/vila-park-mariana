
DROP POLICY IF EXISTS "Admins upload plantas" ON storage.objects;
DROP POLICY IF EXISTS "Admins update plantas" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete plantas" ON storage.objects;

CREATE POLICY "Staff upload plantas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plantas' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff update plantas" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'plantas' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete plantas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'plantas' AND public.is_staff(auth.uid()));
