
CREATE POLICY "Users upload own receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Staff view receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin')
      OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal')
      OR public.has_role(auth.uid(),'vp_academic') OR public.has_role(auth.uid(),'class_teacher')
    )
  );
