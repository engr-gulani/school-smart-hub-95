CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term_id text REFERENCES public.terms(id),
  date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX attendance_class_date_idx ON public.attendance (class_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Staff read attendance" ON public.attendance FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin')
  OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'vp_academic')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = attendance.class_id AND c.class_teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.subjects sb WHERE sb.class_id = attendance.class_id AND sb.teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Marking staff write attendance" ON public.attendance FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin')
  OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'vp_academic')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = attendance.class_id AND c.class_teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'super_admin')
  OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'vp_academic')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = attendance.class_id AND c.class_teacher_id = auth.uid())
);