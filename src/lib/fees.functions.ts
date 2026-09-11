import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Roles held by the caller. */
async function callerRoles(context: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

const isAdmin = (roles: string[]) => roles.includes("school_admin") || roles.includes("super_admin");
/** Accountant plus admins — the people who own the fee desk. */
const isFeeStaff = (roles: string[]) => isAdmin(roles) || roles.includes("accountant");

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  bankName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(4).max(40),
  amountDue: z.number().min(0).max(100_000_000),
  termId: z.string().trim().max(80).optional().or(z.literal("")),
  level: z.string().trim().max(40).optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  isPublished: z.boolean(),
});

const paymentSchema = z.object({
  studentId: z.string().trim().min(1).max(80),
  termId: z.string().trim().max(80).optional().or(z.literal("")),
  amount: z.number().min(0).max(100_000_000),
  method: z.enum(["transfer", "cash", "pos", "online"]),
  transactionRef: z.string().trim().max(120).optional().or(z.literal("")),
  receiptPath: z.string().trim().max(300).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const reviewSchema = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(["approve", "reject", "pending"]),
  reviewNote: z.string().trim().max(500).optional().or(z.literal("")),
});

async function currentTermId(context: { supabase: any }): Promise<string> {
  const { data } = await context.supabase
    .from("school_settings")
    .select("current_term_id")
    .eq("id", "default")
    .maybeSingle();
  return (data?.current_term_id as string) ?? "";
}

export const getFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const roles = await callerRoles(context);
    const staff = isFeeStaff(roles) || roles.includes("principal") || roles.includes("vp_academic");

    const [accountsRes, paymentsRes] = await Promise.all([
      supabase
        .from("fee_accounts")
        .select(
          "id, bank_name, account_name, account_number, amount_due, term_id, level, instructions, is_published, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("fee_payments")
        .select(
          "id, student_id, term_id, amount, method, transaction_ref, receipt_url, note, status, reviewed_at, review_note, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);

    const payments = (paymentsRes.data ?? []) as any[];

    // Receipts live in a private bucket — hand out short-lived links only.
    const paths = payments.map((p) => p.receipt_url).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabase.storage.from("receipts").createSignedUrls(paths, 3600);
      ((urls ?? []) as any[]).forEach((u) => {
        if (u?.path && u?.signedUrl) signed.set(u.path, u.signedUrl);
      });
    }

    const accounts = ((accountsRes.data ?? []) as any[])
      .filter((a) => staff || a.is_published)
      .map((a) => ({
        id: a.id as string,
        bankName: a.bank_name as string,
        accountName: a.account_name as string,
        accountNumber: a.account_number as string,
        amountDue: Number(a.amount_due ?? 0),
        termId: (a.term_id as string) ?? "",
        level: (a.level as string) ?? "",
        instructions: (a.instructions as string) ?? "",
        isPublished: Boolean(a.is_published),
        createdAt: a.created_at as string,
      }));

    return {
      canManage: isFeeStaff(roles),
      canReview: isFeeStaff(roles),
      accounts,
      payments: payments.map((p) => ({
        id: p.id as string,
        studentId: p.student_id as string,
        termId: (p.term_id as string) ?? "",
        amount: Number(p.amount ?? 0),
        method: p.method as string,
        transactionRef: (p.transaction_ref as string) ?? "",
        receiptUrl: p.receipt_url ? (signed.get(p.receipt_url) ?? null) : null,
        note: (p.note as string) ?? "",
        status: p.status as string,
        reviewedAt: (p.reviewed_at as string) ?? null,
        reviewNote: (p.review_note as string) ?? "",
        createdAt: p.created_at as string,
      })),
    };
  });

export const saveFeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isFeeStaff(roles) && !roles.includes("principal")) {
      throw new Error("Only the accountant or an administrator can manage fee account details");
    }
    const row = {
      bank_name: data.bankName,
      account_name: data.accountName,
      account_number: data.accountNumber,
      amount_due: data.amountDue,
      term_id: data.termId || (await currentTermId(context)) || null,
      level: data.level || null,
      instructions: data.instructions || null,
      is_published: data.isPublished,
      created_by: context.userId,
    };

    if (data.id) {
      const { error } = await context.supabase.from("fee_accounts").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("fee_accounts")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, id: created?.id as string };
  });

export const deleteFeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isFeeStaff(roles)) throw new Error("Only the accountant or an administrator can remove fee details");
    const { error } = await context.supabase.from("fee_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** A student (or the fee desk on their behalf) records a payment for review. */
export const submitFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!data.transactionRef && !data.receiptPath) {
      throw new Error("Add a transaction ID or upload the payment receipt");
    }
    const termId = data.termId || (await currentTermId(context));
    if (!termId) throw new Error("No academic term is currently in session");

    const { data: student, error: sErr } = await context.supabase
      .from("students")
      .select("id, user_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Student record not found");
    if (student.user_id !== context.userId && !isFeeStaff(roles)) {
      throw new Error("You can only submit payments for your own account");
    }

    const { error } = await context.supabase.from("fee_payments").insert({
      student_id: data.studentId,
      term_id: termId,
      amount: data.amount,
      method: data.method,
      transaction_ref: data.transactionRef || null,
      receipt_url: data.receiptPath || null,
      note: data.note || null,
      status: "pending",
      submitted_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The accountant approves or rejects a submitted payment. */
export const reviewFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await callerRoles(context);
    if (!isFeeStaff(roles)) throw new Error("Only the accountant or an administrator can approve payments");

    const status = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "pending";
    const { error } = await context.supabase
      .from("fee_payments")
      .update({
        status,
        review_note: data.reviewNote || null,
        reviewed_by: context.userId,
        reviewed_at: status === "pending" ? null : new Date().toISOString(),
      })
      .eq("id", data.paymentId);
    if (error) throw new Error(error.message);
    return { ok: true, status };
  });
