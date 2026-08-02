import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, ROLE_LABEL, can } from "@/lib/auth-context";
import { type Role } from "@/lib/mock-data";
import { useAcademics } from "@/lib/use-academics";
import { createPortalUser, listPortalUsers, resetUserPassword } from "@/lib/user-admin.functions";

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [
      { title: "User Accounts · Greenfield College Portal" },
      {
        name: "description",
        content:
          "Administrator tool to create and manage portal accounts for principals, vice principals, teachers and students.",
      },
      { property: "og:title", content: "User Accounts · Greenfield College Portal" },
      {
        property: "og:description",
        content: "Create portal accounts for staff and students with the right role and access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

const CREATABLE_ROLES: Role[] = [
  "principal",
  "vp_academic",
  "class_teacher",
  "subject_teacher",
  "student",
  "school_admin",
];

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "subject_teacher" as Role,
  staffId: "",
  admissionNo: "",
  classId: "",
};

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out}@26`;
}

function UsersPage() {
  const { user } = useAuth();
  const isAdmin = can(user.role, "manage_school");
  const { data: academics } = useAcademics();
  const classes = academics?.classes ?? [];
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = useServerFn(listPortalUsers);
  const createUser = useServerFn(createPortalUser);
  const resetPassword = useServerFn(resetUserPassword);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const submitReset = async (userId: string) => {
    if (resetPw.length < 8) return toast.error("Password must be at least 8 characters");
    setResetting(true);
    try {
      await resetPassword({ data: { userId, password: resetPw } });
      toast.success("Password reset");
      setResetId(null);
      setResetPw("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reset password");
    } finally {
      setResetting(false);
    }
  };

  const usersQuery = useQuery({
    queryKey: ["portal-users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof emptyForm) => createUser({ data: payload }),
    onSuccess: (res) => {
      toast.success(`Account created for ${res.email}`);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the account"),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="text-muted-foreground h-10 w-10" />
        <h1 className="font-display text-xl font-semibold">Administrators only</h1>
        <p className="text-muted-foreground text-sm">
          You don't have permission to manage portal accounts.
        </p>
      </div>
    );
  }

  const isStudent = form.role === "student";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) return toast.error("Enter the person's full name");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("Enter a valid email address");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Administration
        </p>
        <h1 className="font-display text-3xl font-semibold">User accounts</h1>
        <p className="text-muted-foreground text-sm">
          Create sign-in accounts for principals, vice principals, teachers and students.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" /> Create new account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Grace Adeyemi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="grace@greenfield.edu"
                />
              </div>

              {isStudent ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="admissionNo">Admission number</Label>
                    <Input
                      id="admissionNo"
                      value={form.admissionNo}
                      maxLength={50}
                      onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                      placeholder="GC/2026/014"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="classId">Class</Label>
                    <Select
                      value={form.classId || undefined}
                      onValueChange={(v) => setForm({ ...form, classId: v })}
                    >
                      <SelectTrigger id="classId">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="staffId">Staff ID</Label>
                  <Input
                    id="staffId"
                    value={form.staffId}
                    maxLength={50}
                    onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    placeholder="GC-STF-014"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    value={form.password}
                    maxLength={72}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 8 characters"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Generate password"
                    onClick={() => setForm({ ...form, password: randomPassword() })}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Share this with the user — they can change it from their profile.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Existing accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading accounts…</p>
            ) : usersQuery.error ? (
              <p className="text-destructive py-8 text-center text-sm">
                {(usersQuery.error as Error).message}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                      <th className="py-2 font-medium">Name</th>
                      <th className="py-2 font-medium">Email</th>
                      <th className="py-2 font-medium">Role</th>
                      <th className="py-2 font-medium">ID</th>
                      <th className="py-2 text-right font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersQuery.data ?? []).map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{u.full_name}</td>
                        <td className="text-muted-foreground py-2">{u.email}</td>
                        <td className="py-2">
                          <Badge variant="secondary">
                            {ROLE_LABEL[(u.role as Role) ?? "student"]}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground py-2 font-mono text-xs">
                          {u.staff_id || u.admission_no || "—"}
                        </td>
                        <td className="py-2 text-right">
                          {resetId === u.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="text"
                                value={resetPw}
                                onChange={(e) => setResetPw(e.target.value)}
                                placeholder="New password"
                                className="h-8 w-40"
                              />
                              <Button size="sm" disabled={resetting} onClick={() => submitReset(u.id)}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setResetId(null);
                                  setResetPw("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResetId(u.id);
                                setResetPw("");
                              }}
                            >
                              Reset password
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(usersQuery.data ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-muted-foreground py-8 text-center">
                          No accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
