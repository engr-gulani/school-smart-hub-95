
CREATE TABLE public.fee_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  amount_due numeric NOT NULL DEFAULT 0,
  term_id text REFERENCES public.terms(id),
  level text,
  instructions text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_accounts TO authenticated;
GRANT ALL ON public.fee_accounts TO service_role;
ALTER TABLE public.fee_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fee accounts"
  ON public.fee_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fee staff manage fee accounts"
  ON public.fee_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));

CREATE TRIGGER fee_accounts_updated_at BEFORE UPDATE ON public.fee_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id text NOT NULL REFERENCES public.terms(id),
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'transfer',
  transaction_ref text,
  receipt_url text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own payments"
  ON public.fee_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = fee_payments.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students submit own payments"
  ON public.fee_payments FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = fee_payments.student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Class teachers view own class payments"
  ON public.fee_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = fee_payments.student_id AND c.class_teacher_id = auth.uid()
  ));

CREATE POLICY "Fee staff view payments"
  ON public.fee_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'vp_academic'));

CREATE POLICY "Fee staff manage payments"
  ON public.fee_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER fee_payments_updated_at BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX fee_payments_student_idx ON public.fee_payments (student_id, term_id);
