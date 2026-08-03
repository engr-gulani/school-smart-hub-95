import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX = { ca1: 20, ca2: 10, assignment: 10, exam: 60 } as const;

const saveScoresSchema = z.object({
  subjectId: z.string().trim().min(1).max(80),
  entries: z
    .array(
      z.object({
        studentId: z.string().trim().min(1).max(80),
        ca1: z.number().int().min(0).max(MAX.ca1),
        ca2: z.number().int().min(0).max(MAX.ca2),
        assignment: z.number().int().min(0).max(MAX.assignment),
        exam: z.number().int().min(0).max(MAX.exam),
      }),
    )
    .max(400),
});

const assignSubjectSchema = z.object({
  subjectId: z.string().trim().min(1).max(80),
  teacherId: z.string().uuid().nullable(),
});

const assignClassSchema = z.object({
  classId: z.string().trim().min(1).max(80),
  teacherId: z.string().uuid().nullable(),
});

const approvalSchema = z.object({
  classId: z.string().trim().min(1).max(80),
  termId: z.string().trim().max(80).optional().or(z.literal("")),
  action: z.enum(["submit", "vp_approve", "principal_approve", "publish", "reset"]),
});

/** Roles held by the caller. */
async function callerRoles(context: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

const isAdmin = (roles: string[]) => roles.includes("school_admin") || roles.includes("super_admin");
/** Admins plus the principal and the vice principal (academic). */
const isLeadership = (roles: string[]) =>
  isAdmin(roles) || roles.includes("principal") || roles.includes("vp_academic");

/** The term currently in session, used when a caller doesn't name one. */
async function currentTermId(context: { supabase: any }): Promise<string> {
  const { data } = await context.supabase
    .from("school_settings")
    .select("current_term_id")
    .eq("id", "default")
    .maybeSingle();
  return (data?.current_term_id as string) ?? "";
}


export const getAcademics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const [
      classesRes,
      subjectsRes,
      studentsRes,
      scoresRes,
      approvalsRes,
      profilesRes,
      rolesRes,
      termsRes,
      settingsRes,
      announcementsRes,
      promotionsRes,
    ] = await Promise.all([
      supabase.from("classes").select("id, name, level, sort_order, class_teacher_id").order("sort_order"),
      supabase.from("subjects").select("id, name, code, class_id, teacher_id").order("name"),
      supabase
        .from("students")
        .select("id, admission_no, full_name, gender, dob, class_id, parent_name, parent_phone, address, user_id")
        .order("full_name"),
      supabase.from("scores").select("student_id, subject_id, term_id, ca1, ca2, assignment, exam"),
      supabase
        .from("result_approvals")
        .select("class_id, term_id, stage, submitted_at, vp_approved_at, principal_approved_at, published_at"),
      supabase.from("profiles").select("id, full_name, email, staff_id, admission_no, class_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("terms")
        .select("id, session, name, sort_order, status, starts_on, ends_on")
        .order("session")
        .order("sort_order"),
      supabase.from("school_settings").select("current_term_id, next_term_begins").eq("id", "default").maybeSingle(),
      supabase
        .from("announcements")
        .select("id, title, body, audience, kind, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("promotions")
        .select("student_id, session, from_class_id, to_class_id, decision, average, terms_counted, created_at"),
    ]);

    const firstError = [classesRes, subjectsRes, studentsRes, scoresRes, approvalsRes, profilesRes, rolesRes].find(
      (r: any) => r.error,
    ) as any;
    if (firstError?.error) throw new Error(firstError.error.message);


    const roleMap = new Map<string, string>();
    ((rolesRes.data ?? []) as { user_id: string; role: string }[]).forEach((r) => roleMap.set(r.user_id, r.role));

    const staff = ((profilesRes.data ?? []) as any[])
      .map((p) => ({
        id: p.id as string,
        name: (p.full_name as string) || (p.email as string) || "Unnamed",
        email: (p.email as string) ?? "",
        staffId: (p.staff_id as string) ?? null,
        role: roleMap.get(p.id) ?? "student",
      }))
      .filter((p) => p.role !== "student");

    const staffMap = new Map(staff.map((s) => [s.id, s]));

    const myProfile = ((profilesRes.data ?? []) as any[]).find((p) => p.id === context.userId);
    const myStudent = ((studentsRes.data ?? []) as any[]).find(
      (s) =>
        s.user_id === context.userId ||
        (myProfile?.admission_no &&
          String(s.admission_no).toLowerCase() === String(myProfile.admission_no).toLowerCase()),
    );

    return {
      me: {
        id: context.userId,
        roles: await callerRoles(context),
        name: (myProfile?.full_name as string) ?? "",
        email: (myProfile?.email as string) ?? "",
        admissionNo: (myProfile?.admission_no as string) ?? null,
        studentId: (myStudent?.id as string) ?? null,
      },

      classes: ((classesRes.data ?? []) as any[]).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        level: c.level as string,
        classTeacherId: (c.class_teacher_id as string) ?? null,
        classTeacherName: c.class_teacher_id ? staffMap.get(c.class_teacher_id)?.name ?? null : null,
      })),
      subjects: ((subjectsRes.data ?? []) as any[]).map((s) => ({
        id: s.id as string,
        name: s.name as string,
        code: s.code as string,
        classId: s.class_id as string,
        teacherId: (s.teacher_id as string) ?? null,
        teacherName: s.teacher_id ? staffMap.get(s.teacher_id)?.name ?? null : null,
        teacherStaffId: s.teacher_id ? staffMap.get(s.teacher_id)?.staffId ?? null : null,
      })),
      students: ((studentsRes.data ?? []) as any[]).map((s) => ({
        id: s.id as string,
        admissionNo: s.admission_no as string,
        name: s.full_name as string,
        gender: s.gender as string,
        dob: (s.dob as string) ?? "",
        classId: s.class_id as string,
        parentName: (s.parent_name as string) ?? "",
        parentPhone: (s.parent_phone as string) ?? "",
        address: (s.address as string) ?? "",
        userId: (s.user_id as string) ?? null,
      })),
      scores: ((scoresRes.data ?? []) as any[]).map((s) => ({
        studentId: s.student_id as string,
        subjectId: s.subject_id as string,
        termId: (s.term_id as string) ?? "",
        ca1: s.ca1 as number,
        ca2: s.ca2 as number,
        assignment: s.assignment as number,
        exam: s.exam as number,
      })),
      approvals: ((approvalsRes.data ?? []) as any[]).map((a) => ({
        classId: a.class_id as string,
        termId: (a.term_id as string) ?? "",
        stage: a.stage as string,
        submittedAt: (a.submitted_at as string) ?? null,
        vpApprovedAt: (a.vp_approved_at as string) ?? null,
        principalApprovedAt: (a.principal_approved_at as string) ?? null,
        publishedAt: (a.published_at as string) ?? null,
      })),
      terms: ((termsRes.data ?? []) as any[]).map((t) => ({
        id: t.id as string,
        session: t.session as string,
        name: t.name as string,
        sortOrder: t.sort_order as number,
        status: t.status as string,
        startsOn: (t.starts_on as string) ?? null,
        endsOn: (t.ends_on as string) ?? null,
      })),
      settings: {
        currentTermId: ((settingsRes as any)?.data?.current_term_id as string) ?? "",
        nextTermBegins: ((settingsRes as any)?.data?.next_term_begins as string) ?? null,
      },
      announcements: ((announcementsRes.data ?? []) as any[]).map((a) => ({
        id: a.id as string,
        title: a.title as string,
        body: a.body as string,
        audience: a.audience as string,
        kind: a.kind as string,
        createdAt: a.created_at as string,
      })),
      promotions: ((promotionsRes.data ?? []) as any[]).map((p) => ({
        studentId: p.student_id as string,
        session: p.session as string,
        fromClassId: (p.from_class_id as string) ?? null,
        toClassId: (p.to_class_id as string) ?? null,
        decision: p.decision as string,
        average: Number(p.average ?? 0),
        termsCounted: (p.terms_counted as number) ?? 0,
        createdAt: p.created_at as string,
      })),
      staff,
    };

  });

export const saveSubjectScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveScoresSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    const { data: subject, error: subErr } = await context.supabase
      .from("subjects")
      .select("id, teacher_id, class_id")
      .eq("id", data.subjectId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!subject) throw new Error("Subject not found");

    const owns = subject.teacher_id === context.userId;
    if (!owns && !isAdmin(roles)) throw new Error("You are not assigned to this subject");

    const termId = data.termId || (await currentTermId(context));
    if (!termId) throw new Error("No academic term is currently in session");

    const { data: term } = await context.supabase.from("terms").select("status").eq("id", termId).maybeSingle();
    if (term?.status === "closed" && !isAdmin(roles)) {
      throw new Error("This term is closed — scores can no longer be edited");
    }

    // Scores are locked once the class result has left the teacher's desk.
    const { data: approval } = await context.supabase
      .from("result_approvals")
      .select("stage")
      .eq("class_id", subject.class_id)
      .eq("term_id", termId)
      .maybeSingle();
    if (approval && approval.stage !== "draft" && !isAdmin(roles)) {
      throw new Error("Results for this class are already submitted for approval and can no longer be edited");
    }

    const rows = data.entries.map((e) => ({
      student_id: e.studentId,
      subject_id: data.subjectId,
      term_id: termId,
      ca1: e.ca1,
      ca2: e.ca2,
      assignment: e.assignment,
      exam: e.exam,
      entered_by: context.userId,
    }));

    const { error } = await context.supabase
      .from("scores")
      .upsert(rows, { onConflict: "student_id,subject_id,term_id" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };

  });

export const assignSubjectTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignSubjectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isAdmin(roles) && !roles.includes("vp_academic") && !roles.includes("principal")) {
      throw new Error("Only admins and the vice principal can assign subject teachers");
    }
    const { error } = await context.supabase
      .from("subjects")
      .update({ teacher_id: data.teacherId })
      .eq("id", data.subjectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignClassSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isAdmin(roles) && !roles.includes("vp_academic") && !roles.includes("principal")) {
      throw new Error("Only admins and the vice principal can assign class teachers");
    }
    const { error } = await context.supabase
      .from("classes")
      .update({ class_teacher_id: data.teacherId })
      .eq("id", data.classId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateResultApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => approvalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    const admin = isAdmin(roles);
    const now = new Date().toISOString();

    const { data: current } = await context.supabase
      .from("result_approvals")
      .select("class_id, stage")
      .eq("class_id", data.classId)
      .maybeSingle();
    const stage = current?.stage ?? "draft";

    let patch: Record<string, unknown>;
    switch (data.action) {
      case "submit": {
        const isTeacher =
          roles.includes("subject_teacher") || roles.includes("class_teacher") || admin;
        if (!isTeacher) throw new Error("Only teachers can submit results for approval");
        if (stage !== "draft") throw new Error("Results have already been submitted");
        patch = { stage: "vp_review", submitted_by: context.userId, submitted_at: now };
        break;
      }
      case "vp_approve": {
        if (!admin && !roles.includes("vp_academic")) throw new Error("Only the vice principal can approve at this stage");
        if (stage !== "vp_review") throw new Error("Results are not awaiting VP approval");
        patch = { stage: "principal_review", vp_approved_by: context.userId, vp_approved_at: now };
        break;
      }
      case "principal_approve": {
        if (!admin && !roles.includes("principal")) throw new Error("Only the principal can approve at this stage");
        if (stage !== "principal_review") throw new Error("Results are not awaiting principal approval");
        patch = { stage: "approved", principal_approved_by: context.userId, principal_approved_at: now };
        break;
      }
      case "publish": {
        if (!admin && !roles.includes("principal")) throw new Error("Only the principal can publish results");
        if (stage !== "approved") throw new Error("Results must be approved before publishing");
        patch = { stage: "published", published_by: context.userId, published_at: now };
        break;
      }
      case "reset": {
        if (!admin && !roles.includes("principal") && !roles.includes("vp_academic")) {
          throw new Error("Only admins, the principal or the vice principal can return results to the teacher");
        }
        patch = {
          stage: "draft",
          submitted_by: null,
          submitted_at: null,
          vp_approved_by: null,
          vp_approved_at: null,
          principal_approved_by: null,
          principal_approved_at: null,
          published_by: null,
          published_at: null,
        };
        break;
      }
    }

    const { error } = await context.supabase
      .from("result_approvals")
      .upsert({ class_id: data.classId, ...patch }, { onConflict: "class_id" });
    if (error) throw new Error(error.message);
    return { stage: (patch as any).stage as string };
  });

const studentSchema = z.object({
  id: z.string().trim().max(80).optional().or(z.literal("")),
  admissionNo: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(2).max(120),
  gender: z.enum(["Male", "Female"]),
  dob: z.string().trim().max(20).optional().or(z.literal("")),
  classId: z.string().trim().min(1).max(80),
  parentName: z.string().trim().max(120).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

/** Create or update a student record. Admins, or the class teacher of that class. */
export const upsertStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isAdmin(roles)) {
      const { data: cls } = await context.supabase
        .from("classes")
        .select("class_teacher_id")
        .eq("id", data.classId)
        .maybeSingle();
      if (!cls || cls.class_teacher_id !== context.userId) {
        throw new Error("Only admins or the class teacher can manage students in this class");
      }
    }

    const id = data.id || `st-${data.admissionNo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const row = {
      id,
      admission_no: data.admissionNo,
      full_name: data.fullName,
      gender: data.gender,
      dob: data.dob ? data.dob : null,
      class_id: data.classId,
      parent_name: data.parentName || null,
      parent_phone: data.parentPhone || null,
      address: data.address || null,
    };

    const { error } = await context.supabase.from("students").upsert(row, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { id };
  });

const contactSchema = z.object({
  parentPhone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

/** A signed-in student updates their own contact details. */
export const updateMyContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("admission_no")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: student } = await context.supabase
      .from("students")
      .select("id")
      .or(
        profile?.admission_no
          ? `user_id.eq.${context.userId},admission_no.eq.${profile.admission_no}`
          : `user_id.eq.${context.userId}`,
      )
      .maybeSingle();
    if (!student) throw new Error("No student record is linked to your account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("students")
      .update({
        parent_phone: data.parentPhone || null,
        address: data.address || null,
        user_id: context.userId,
      })
      .eq("id", student.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const classSchema = z.object({
  id: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  level: z.enum(["Nursery", "Primary", "Junior Secondary", "Senior Secondary"]),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

/** Admins create or rename a class. */
export const upsertClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isAdmin(roles)) throw new Error("Only admins can manage classes");

    const id = data.id || `cls-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const { data: existing } = await context.supabase
      .from("classes")
      .select("sort_order")
      .eq("id", id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("classes")
      .upsert(
        {
          id,
          name: data.name,
          level: data.level,
          sort_order: data.sortOrder ?? existing?.sort_order ?? 100,
        },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { id };
  });

const subjectSchema = z.object({
  id: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(20),
  classId: z.string().trim().min(1).max(80),
});

/** Admins create or edit a subject for a class. */
export const upsertSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subjectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isAdmin(roles)) throw new Error("Only admins can manage subjects");

    const id =
      data.id || `sub-${data.classId}-${data.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const { error } = await context.supabase
      .from("subjects")
      .upsert({ id, name: data.name, code: data.code.toUpperCase(), class_id: data.classId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { id };
  });
