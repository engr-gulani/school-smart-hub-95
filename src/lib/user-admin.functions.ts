import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "school_admin",
  "principal",
  "vp_academic",
  "class_teacher",
  "subject_teacher",
  "student",
] as const;

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
  staffId: z.string().trim().max(50).optional().or(z.literal("")),
  admissionNo: z.string().trim().max(50).optional().or(z.literal("")),
  classId: z.string().trim().max(50).optional().or(z.literal("")),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const [a, b] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "school_admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (!a.data && !b.data) throw new Error("Forbidden: admin access required");
}

export const listPortalUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, staff_id, admission_no, class_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: { user_id: string; role: string }) => roleMap.set(r.user_id, r.role));

    type Row = {
      id: string;
      full_name: string | null;
      email: string | null;
      staff_id: string | null;
      admission_no: string | null;
      class_id: string | null;
      created_at: string;
      role: string;
    };

    return ((profiles ?? []) as Omit<Row, "role">[]).map((p): Row => ({
      ...p,
      role: roleMap.get(p.id) ?? "student",
    }));
  });

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
        staff_id: data.staffId || null,
        admission_no: data.admissionNo || null,
        class_id: data.classId || null,
      },
    });
    if (error) throw new Error(error.message);

    return { id: created.user?.id, email: data.email, role: data.role };
  });

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

/** Admin-only password reset — users (including students) cannot change their own password. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
