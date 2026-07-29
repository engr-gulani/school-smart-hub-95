import { createServerFn } from "@tanstack/react-start";

export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "admin@greenfield.edu";
  const password = "Admin@Greenfield2026";

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email?.toLowerCase() === email);
  let userId = found?.id;

  if (!found) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "School Administrator", role: "school_admin" },
    });
    if (error) throw error;
    userId = data.user!.id;
  } else {
    await supabaseAdmin.auth.admin.updateUserById(found.id, { password });
  }

  // Ensure role row exists
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId!, role: "school_admin" }, { onConflict: "user_id,role" });

  return { email, password, userId };
});
