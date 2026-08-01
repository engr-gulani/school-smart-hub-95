import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { User, Role } from "./mock-data";

interface AuthCtx {
  user: User;
  session: Session;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Only render children when there's an authenticated user with a loaded
 * profile. Redirects to /auth otherwise. Consumers get a non-null user.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (sess: Session | null) => {
      if (!sess) {
        if (mounted) {
          setUser(null);
          setReady(true);
        }
        return;
      }
      const uid = sess.user.id;
      const email = sess.user.email ?? "";

      const [{ data: profile }, { data: roleRows }, { data: myClasses }, { data: mySubjects }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("classes").select("id").eq("class_teacher_id", uid),
          supabase.from("subjects").select("id").eq("teacher_id", uid),
        ]);

      const role: Role = (roleRows?.[0]?.role as Role) ?? "student";

      // Link the signed-in account to its student record (by user_id, else admission no.)
      let studentId: string | undefined;
      if (role === "student") {
        const byUser = await supabase.from("students").select("id").eq("user_id", uid).maybeSingle();
        studentId = byUser.data?.id;
        if (!studentId && profile?.admission_no) {
          const byAdm = await supabase
            .from("students")
            .select("id")
            .eq("admission_no", profile.admission_no)
            .maybeSingle();
          studentId = byAdm.data?.id;
        }
      }

      const composed: User = {
        id: uid,
        name: profile?.full_name || email.split("@")[0],
        email,
        role,
        staffId: profile?.staff_id ?? undefined,
        classIds: (myClasses ?? []).map((c) => c.id),
        subjectIds: (mySubjects ?? []).map((s) => s.id),
        studentId,
      };

      if (mounted) {
        setUser(composed);
        setReady(true);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadUser(s), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUser(data.session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready && !session) navigate({ to: "/auth" });
  }, [ready, session, navigate]);

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
        Loading…
      </div>
    );
  }
  if (!session || !user) return null;

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return <Ctx.Provider value={{ user, session, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Administrator",
  school_admin: "School Administrator",
  principal: "Principal",
  vp_academic: "Vice Principal (Academic)",
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
  student: "Student",
};

export type Action =
  | "manage_school"
  | "manage_students"
  | "manage_teachers"
  | "manage_classes"
  | "assign_subjects"
  | "publish_results"
  | "vp_approve"
  | "principal_approve"
  | "enter_scores"
  | "view_broadsheet"
  | "view_own_results";

export function can(role: Role, action: Action): boolean {
  const isAdmin = role === "school_admin" || role === "super_admin";
  switch (action) {
    case "manage_school":
    case "manage_teachers":
    case "manage_classes":
      return isAdmin;
    case "manage_students":
      return isAdmin || role === "class_teacher";
    case "assign_subjects":
      return isAdmin || role === "vp_academic";
    case "publish_results":
      return isAdmin;
    case "vp_approve":
      return isAdmin || role === "vp_academic";
    case "principal_approve":
      return isAdmin || role === "principal";
    case "enter_scores":
      return role === "subject_teacher";
    case "view_broadsheet":
      return role !== "subject_teacher" && role !== "student";
    case "view_own_results":
      return role === "student";
  }
}
