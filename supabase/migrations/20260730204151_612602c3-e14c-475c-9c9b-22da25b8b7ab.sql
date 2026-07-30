-- CLASSES
CREATE TABLE public.classes (
  id text PRIMARY KEY,
  name text NOT NULL,
  level text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  class_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "VP can assign class teachers" ON public.classes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'vp_academic') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'vp_academic') OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUBJECTS
CREATE TABLE public.subjects (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subjects_class_idx ON public.subjects(class_id);
CREATE INDEX subjects_teacher_idx ON public.subjects(teacher_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "VP can assign subject teachers" ON public.subjects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'vp_academic') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'vp_academic') OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STUDENTS
CREATE TABLE public.students (
  id text PRIMARY KEY,
  admission_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  gender text NOT NULL DEFAULT 'Male',
  dob date,
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  parent_name text,
  parent_phone text,
  address text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX students_class_idx ON public.students(class_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Class teachers update own class students" ON public.students FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id AND c.class_teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id AND c.class_teacher_id = auth.uid()));
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCORES
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  ca1 int NOT NULL DEFAULT 0,
  ca2 int NOT NULL DEFAULT 0,
  assignment int NOT NULL DEFAULT 0,
  exam int NOT NULL DEFAULT 0,
  entered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id),
  CONSTRAINT scores_range CHECK (
    ca1 BETWEEN 0 AND 20 AND ca2 BETWEEN 0 AND 10 AND assignment BETWEEN 0 AND 10 AND exam BETWEEN 0 AND 60
  )
);
CREATE INDEX scores_subject_idx ON public.scores(subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view scores" ON public.scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage scores" ON public.scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Subject teachers insert own subject scores" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = scores.subject_id AND s.teacher_id = auth.uid()));
CREATE POLICY "Subject teachers update own subject scores" ON public.scores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = scores.subject_id AND s.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = scores.subject_id AND s.teacher_id = auth.uid()));
CREATE TRIGGER scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RESULT APPROVALS
CREATE TABLE public.result_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'draft',
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  vp_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  vp_approved_at timestamptz,
  principal_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  principal_approved_at timestamptz,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT result_approvals_stage_valid CHECK (stage IN ('draft','vp_review','principal_review','approved','published'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_approvals TO authenticated;
GRANT ALL ON public.result_approvals TO service_role;
ALTER TABLE public.result_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view approvals" ON public.result_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage approvals" ON public.result_approvals FOR ALL TO authenticated
  USING (NOT public.has_role(auth.uid(),'student'))
  WITH CHECK (NOT public.has_role(auth.uid(),'student'));
CREATE TRIGGER result_approvals_updated_at BEFORE UPDATE ON public.result_approvals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED DEMO DATA ============
INSERT INTO public.classes (id, name, level, sort_order) VALUES
('c-nur1','Nursery 1','Nursery',0),
('c-nur2','Nursery 2','Nursery',1),
('c-pri1','Primary 1','Primary',2),
('c-pri3','Primary 3','Primary',3),
('c-pri6','Primary 6','Primary',4),
('c-jss1a','JSS 1A','JSS',5),
('c-jss2a','JSS 2A','JSS',6),
('c-jss3a','JSS 3A','JSS',7),
('c-ss1a','SS 1A','SS',8),
('c-ss1b','SS 1B','SS',9),
('c-ss2a','SS 2A','SS',10),
('c-ss3a','SS 3A','SS',11);

INSERT INTO public.subjects (id, name, code, class_id) VALUES
('s-math-ss1a','Mathematics','MTH','c-ss1a'),
('s-phy-ss1a','Physics','PHY','c-ss1a'),
('s-chem-ss1a','Chemistry','CHM','c-ss1a'),
('s-eng-ss1a','English Language','ENG','c-ss1a'),
('s-bio-ss1a','Biology','BIO','c-ss1a'),
('s-math-ss1b','Mathematics','MTH','c-ss1b'),
('s-eng-jss1a','English Language','ENG','c-jss1a'),
('s-math-jss1a','Mathematics','MTH','c-jss1a'),
('s-bst-jss1a','Basic Science','BST','c-jss1a'),
('s-eng-pri3','English Language','ENG','c-pri3'),
('s-math-pri3','Mathematics','MTH','c-pri3');

INSERT INTO public.students (id, admission_no, full_name, gender, dob, class_id, parent_name, parent_phone, address)
SELECT
  'st-' || n.i,
  'GC/2025/' || lpad((1000 + n.i)::text, 4, '0'),
  (ARRAY['Ahmed','Mary','Musa','Chinelo','David','Fatima','Emeka','Grace','Sade','Ibrahim','Ngozi','Kunle','Zainab','Peter','Halima'])[((n.i * 3) % 15) + 1]
    || ' ' ||
  (ARRAY['Okafor','Bello','Ibrahim','Okonkwo','Adeyemi','Musa','Eze','Danjuma','Okoro','Balogun','Yusuf','Ojo','Nwosu','Aliyu','Umar'])[((n.i * 5) % 15) + 1],
  CASE WHEN n.i % 2 = 0 THEN 'Male' ELSE 'Female' END,
  make_date((2010 + (n.i % 4))::int, (1 + (n.i % 8))::int, (1 + (n.i % 27))::int),
  n.class_id,
  'Mr. ' || (ARRAY['Okafor','Bello','Ibrahim','Okonkwo','Adeyemi','Musa','Eze','Danjuma','Okoro','Balogun','Yusuf','Ojo','Nwosu','Aliyu','Umar'])[((n.i * 5) % 15) + 1],
  '+2348' || lpad(((10000000 + n.i * 137) % 100000000)::text, 8, '0'),
  n.i || ' Palm Avenue, Lagos'
FROM (
  SELECT c.id AS class_id,
         row_number() OVER (ORDER BY c.sort_order, g) AS i
  FROM public.classes c
  CROSS JOIN LATERAL generate_series(1, CASE WHEN c.id = 'c-ss1a' THEN 12 ELSE 8 END) g
) n;

INSERT INTO public.scores (student_id, subject_id, ca1, ca2, assignment, exam)
SELECT st.id, sub.id,
  12 + (h % 8),
  4 + ((h * 3) % 6),
  4 + (h % 6),
  35 + ((h * 7) % 25)
FROM public.students st
JOIN public.subjects sub ON sub.class_id = st.class_id
CROSS JOIN LATERAL (
  SELECT (('x' || substr(md5(st.id || sub.id), 1, 8))::bit(32)::bigint & 2147483647) % 20 AS h
) q;

INSERT INTO public.result_approvals (class_id, stage)
SELECT id, CASE WHEN id = 'c-ss1a' THEN 'vp_review' ELSE 'draft' END FROM public.classes;