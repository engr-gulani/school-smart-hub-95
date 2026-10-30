ALTER POLICY "Authenticated can view fee accounts" ON public.fee_accounts USING (
  is_published
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'accountant')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'vp_academic')
);