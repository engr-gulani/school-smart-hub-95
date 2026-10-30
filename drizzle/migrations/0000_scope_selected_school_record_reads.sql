ALTER POLICY "Authenticated can view students" ON public.students USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR public.has_role(auth.uid(), 'accountant')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id AND c.class_teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.subjects s WHERE s.class_id = students.class_id AND s.teacher_id = auth.uid())
);

ALTER POLICY "Authenticated can view profiles" ON public.profiles USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR (
    (public.has_role(auth.uid(), 'class_teacher') OR public.has_role(auth.uid(), 'subject_teacher') OR public.has_role(auth.uid(), 'accountant'))
    AND (
      public.has_role(profiles.id, 'super_admin') OR public.has_role(profiles.id, 'school_admin')
      OR public.has_role(profiles.id, 'principal') OR public.has_role(profiles.id, 'vp_academic')
      OR public.has_role(profiles.id, 'class_teacher') OR public.has_role(profiles.id, 'subject_teacher') OR public.has_role(profiles.id, 'accountant')
      OR EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = profiles.id)
    )
  )
);

ALTER POLICY "Authenticated can view roles" ON public.user_roles USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR (
    (public.has_role(auth.uid(), 'class_teacher') OR public.has_role(auth.uid(), 'subject_teacher') OR public.has_role(auth.uid(), 'accountant'))
    AND role IN ('super_admin', 'school_admin', 'principal', 'vp_academic', 'class_teacher', 'subject_teacher', 'accountant')
  )
);

ALTER POLICY "Authenticated can view scores" ON public.scores USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = scores.subject_id AND s.teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON c.id = s.class_id WHERE s.id = scores.student_id AND c.class_teacher_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.students s JOIN public.result_approvals a ON a.class_id = s.class_id
    WHERE s.id = scores.student_id AND s.user_id = auth.uid() AND a.term_id = scores.term_id AND a.stage = 'published'
  )
);

ALTER POLICY "Authenticated can view approvals" ON public.result_approvals USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = result_approvals.class_id AND c.class_teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.subjects s WHERE s.class_id = result_approvals.class_id AND s.teacher_id = auth.uid())
  OR (stage = 'published' AND EXISTS (SELECT 1 FROM public.students s WHERE s.class_id = result_approvals.class_id AND s.user_id = auth.uid()))
);
-- The existing ALL policy also participates in reads. Bound SELECT without changing write permissions.
CREATE POLICY "Scope approval reads across all policies" ON public.result_approvals AS RESTRICTIVE FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = result_approvals.class_id AND c.class_teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.subjects s WHERE s.class_id = result_approvals.class_id AND s.teacher_id = auth.uid())
  OR (stage = 'published' AND EXISTS (SELECT 1 FROM public.students s WHERE s.class_id = result_approvals.class_id AND s.user_id = auth.uid()))
);

ALTER POLICY "Authenticated can view promotions" ON public.promotions USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'school_admin')
  OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'vp_academic')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = promotions.student_id
    AND (
      s.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = s.class_id AND c.class_teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.subjects sub WHERE sub.class_id = s.class_id AND sub.teacher_id = auth.uid())
    )
  )
);