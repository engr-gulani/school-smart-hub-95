import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { USERS, type User, type Role } from "./mock-data";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  session: Session | null;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (sess: Session | null) => {
      if (!sess) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const uid = sess.user.id;
      const email = sess.user.email ?? "";

      // Defer DB calls to avoid deadlock inside onAuthStateChange
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      const role: Role = (roleRows?.[0]?.role as Role) ?? "student";
      // Merge with mock data by email so existing screens (teacher subjects,
      // student record links) keep working for demo accounts.
      const mock = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

      const composed: User = {
        id: uid,
        name: profile?.full_name || mock?.name || email.split("@")[0],
        email,
        role,
        staffId: profile?.staff_id ?? mock?.staffId,
        classIds: mock?.classIds,
        subjectIds: mock?.subjectIds,
        studentId: mock?.studentId,
      };
      if (mounted) {
        setUser(composed);
        setLoading(false);
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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return <Ctx.Provider value={{ user, session, loading, logout }}>{children}</Ctx.Provider>;
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
