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
  action: z.enum(["submit", "vp_approve", "principal_approve", "publish", "reset"]),
});

/** Roles held by the caller. */
async function callerRoles(context: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

const isAdmin = (roles: string[]) => roles.includes("school_admin") || roles.includes("super_admin");

export const getAcademics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const [classesRes, subjectsRes, studentsRes, scoresRes, approvalsRes, profilesRes, rolesRes] =
      await Promise.all([
        supabase.from("classes").select("id, name, level, sort_order, class_teacher_id").order("sort_order"),
        supabase.from("subjects").select("id, name, code, class_id, teacher_id").order("name"),
        supabase
          .from("students")
          .select("id, admission_no, full_name, gender, dob, class_id, parent_name, parent_phone, address, user_id")
          .order("full_name"),
        supabase.from("scores").select("student_id, subject_id, ca1, ca2, assignment, exam"),
        supabase.from("result_approvals").select("class_id, stage, submitted_at, vp_approved_at, principal_approved_at, published_at"),
        supabase.from("profiles").select("id, full_name, email, staff_id, admission_no, class_id"),

        supabase.from("user_roles").select("user_id, role"),
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

    return {
      me: { id: context.userId, roles: await callerRoles(context) },
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
      })),
      scores: ((scoresRes.data ?? []) as any[]).map((s) => ({
        studentId: s.student_id as string,
        subjectId: s.subject_id as string,
        ca1: s.ca1 as number,
        ca2: s.ca2 as number,
        assignment: s.assignment as number,
        exam: s.exam as number,
      })),
      approvals: ((approvalsRes.data ?? []) as any[]).map((a) => ({
        classId: a.class_id as string,
        stage: a.stage as string,
        submittedAt: (a.submitted_at as string) ?? null,
        vpApprovedAt: (a.vp_approved_at as string) ?? null,
        principalApprovedAt: (a.principal_approved_at as string) ?? null,
        publishedAt: (a.published_at as string) ?? null,
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

    // Scores are locked once the class result has left the teacher's desk.
    const { data: approval } = await context.supabase
      .from("result_approvals")
      .select("stage")
      .eq("class_id", subject.class_id)
      .maybeSingle();
    if (approval && approval.stage !== "draft" && !isAdmin(roles)) {
      throw new Error("Results for this class are already submitted for approval and can no longer be edited");
    }

    const rows = data.entries.map((e) => ({
      student_id: e.studentId,
      subject_id: data.subjectId,
      ca1: e.ca1,
      ca2: e.ca2,
      assignment: e.assignment,
      exam: e.exam,
      entered_by: context.userId,
    }));

    const { error } = await context.supabase.from("scores").upsert(rows, { onConflict: "student_id,subject_id" });
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
