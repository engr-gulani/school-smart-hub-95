
-- 1. TERMS
CREATE TABLE public.terms (
  id text PRIMARY KEY,
  session text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view terms" ON public.terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leadership manage terms" ON public.terms FOR ALL TO authenticated
  USING (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal'))
  WITH CHECK (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal'));
CREATE TRIGGER terms_updated_at BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. SETTINGS
CREATE TABLE public.school_settings (
  id text PRIMARY KEY DEFAULT 'default',
  current_term_id text REFERENCES public.terms(id),
  next_term_begins date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view settings" ON public.school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leadership manage settings" ON public.school_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal'))
  WITH CHECK (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal'));
CREATE TRIGGER school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  kind text NOT NULL DEFAULT 'announcement',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leadership manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'))
  WITH CHECK (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'));

-- 4. PROMOTIONS
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session text NOT NULL,
  from_class_id text REFERENCES public.classes(id),
  to_class_id text REFERENCES public.classes(id),
  decision text NOT NULL DEFAULT 'promoted',
  average numeric(5,2) NOT NULL DEFAULT 0,
  terms_counted integer NOT NULL DEFAULT 0,
  decided_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, session)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view promotions" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leadership manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'))
  WITH CHECK (has_role(auth.uid(),'school_admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'));
CREATE TRIGGER promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. SEED TERMS + SETTINGS
INSERT INTO public.terms (id, session, name, sort_order, status, starts_on, ends_on) VALUES
  ('2025-2026-t1','2025/2026','First Term',1,'open','2025-09-15','2025-12-12'),
  ('2025-2026-t2','2025/2026','Second Term',2,'upcoming','2026-01-08','2026-04-03'),
  ('2025-2026-t3','2025/2026','Third Term',3,'upcoming','2026-04-27','2026-07-24');
INSERT INTO public.school_settings (id, current_term_id, next_term_begins)
  VALUES ('default','2025-2026-t1','2026-01-08');

-- 6. TERM DIMENSION ON SCORES / APPROVALS
ALTER TABLE public.scores ADD COLUMN term_id text REFERENCES public.terms(id);
UPDATE public.scores SET term_id = '2025-2026-t1' WHERE term_id IS NULL;
ALTER TABLE public.scores ALTER COLUMN term_id SET NOT NULL;
ALTER TABLE public.scores ALTER COLUMN term_id SET DEFAULT '2025-2026-t1';

ALTER TABLE public.result_approvals ADD COLUMN term_id text REFERENCES public.terms(id);
UPDATE public.result_approvals SET term_id = '2025-2026-t1' WHERE term_id IS NULL;
ALTER TABLE public.result_approvals ALTER COLUMN term_id SET NOT NULL;
ALTER TABLE public.result_approvals ALTER COLUMN term_id SET DEFAULT '2025-2026-t1';

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='public.scores'::regclass AND contype='u' LOOP
    EXECUTE format('ALTER TABLE public.scores DROP CONSTRAINT %I', r.conname);
  END LOOP;
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='public.result_approvals'::regclass AND contype='u' LOOP
    EXECUTE format('ALTER TABLE public.result_approvals DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.scores ADD CONSTRAINT scores_student_subject_term_key UNIQUE (student_id, subject_id, term_id);
ALTER TABLE public.result_approvals ADD CONSTRAINT result_approvals_class_term_key UNIQUE (class_id, term_id);

-- 7. PRINCIPAL / VP CAN MANAGE STUDENTS, CLASSES, SUBJECTS
CREATE POLICY "Leadership manage students" ON public.students FOR ALL TO authenticated
  USING (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'))
  WITH CHECK (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'));
CREATE POLICY "Leadership manage classes" ON public.classes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'))
  WITH CHECK (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'));
CREATE POLICY "Leadership manage subjects" ON public.subjects FOR ALL TO authenticated
  USING (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'))
  WITH CHECK (has_role(auth.uid(),'principal') OR has_role(auth.uid(),'vp_academic'));
