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
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
};

export function can(role: Role, action:
  | "manage_school"
  | "manage_students"
  | "manage_teachers"
  | "manage_classes"
  | "publish_results"
  | "approve_results"
  | "enter_scores"
  | "view_broadsheet"
): boolean {
  switch (action) {
    case "manage_school":
    case "manage_students":
    case "manage_teachers":
    case "manage_classes":
      return role === "school_admin" || role === "super_admin";
    case "publish_results":
      return role === "school_admin" || role === "super_admin";
    case "approve_results":
      return ["principal", "class_teacher", "school_admin", "super_admin"].includes(role);
    case "enter_scores":
      return ["subject_teacher", "class_teacher"].includes(role);
    case "view_broadsheet":
      return role !== "subject_teacher";
  }
}
