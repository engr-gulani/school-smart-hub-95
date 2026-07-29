import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "admin@greenfield.edu";
        const password = "Admin@Greenfield2026";

        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });
        const found = list.users.find((u) => u.email?.toLowerCase() === email);
        let userId = found?.id;

        if (!found) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: "School Administrator", role: "school_admin" },
          });
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          userId = data.user!.id;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(found.id, { password });
        }

        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId!, role: "school_admin" as const }, { onConflict: "user_id,role" });
        await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId!, email, full_name: "School Administrator" }, { onConflict: "id" });

        return new Response(JSON.stringify({ email, password, userId }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
