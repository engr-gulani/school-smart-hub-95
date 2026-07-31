import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useAcademics } from "@/lib/use-academics";
import { ROLE_LABEL, useAuth, can, type Role } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers · Greenfield College Portal" },
      { name: "description", content: "Staff directory with class and subject assignments." },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();

  const staff = data?.staff ?? [];
  const classes = data?.classes ?? [];
  const subjects = data?.subjects ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Teachers</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading staff…" : `${staff.length} staff accounts with their current assignments.`}
          </p>
        </div>
        {can(user.role, "manage_school") && (
          <Link to="/users">
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Add staff account
            </Button>
          </Link>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Staff directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">Staff ID</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Assignments</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((t) => {
                const myClasses = classes.filter((c) => c.classTeacherId === t.id);
                const mySubjects = subjects.filter((s) => s.teacherId === t.id);
                return (
                  <tr key={t.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{t.staffId ?? "—"}</td>
                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={t.role === "class_teacher" ? "default" : "secondary"}>
                        {ROLE_LABEL[t.role as Role] ?? t.role}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground py-2 pr-4">{t.email}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {myClasses.map((c) => (
                          <Badge key={c.id} variant="outline">
                            Class teacher · {c.name}
                          </Badge>
                        ))}
                        {mySubjects.map((s) => {
                          const c = classes.find((x) => x.id === s.classId);
                          return (
                            <Badge key={s.id} variant="outline">
                              {s.code} · {c?.name ?? s.classId}
                            </Badge>
                          );
                        })}
                        {!myClasses.length && !mySubjects.length && (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                    No staff accounts yet. Create them from the User Accounts page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
