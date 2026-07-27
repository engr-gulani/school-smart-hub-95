import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { USERS, type User, type Role } from "./mock-data";

interface AuthCtx {
  user: User;
  setUserById: (id: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const STORAGE_KEY = "gc.currentUserId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(USERS[0].id);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && USERS.find((u) => u.id === stored)) setUserId(stored);
  }, []);

  const user = USERS.find((u) => u.id === userId) ?? USERS[0];

  const setUserById = (id: string) => {
    setUserId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const logout = () => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setUserId(USERS[0].id);
  };

  return <Ctx.Provider value={{ user, setUserById, logout }}>{children}</Ctx.Provider>;
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

