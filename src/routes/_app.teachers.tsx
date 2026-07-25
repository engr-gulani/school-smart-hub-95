import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, KeyRound } from "lucide-react";
import { CLASSES, SUBJECTS, USERS } from "@/lib/mock-data";
import { ROLE_LABEL } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/teachers")({
  head: () => ({ meta: [{ title: "Teachers · Greenfield College Portal" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const teachers = USERS.filter((u) => u.role === "class_teacher" || u.role === "subject_teacher");
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Teachers</h1>
          <p className="text-muted-foreground text-sm">Manage teachers, assignments and access.</p>
        </div>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add teacher</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Staff directory</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">Staff ID</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Assignments</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const subs = SUBJECTS.filter((s) => t.subjectIds?.includes(s.id));
                const cls = CLASSES.filter((c) => t.classIds?.includes(c.id));
                return (
                  <tr key={t.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{t.staffId ?? "—"}</td>
                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={t.role === "class_teacher" ? "default" : "secondary"}>
                        {ROLE_LABEL[t.role]}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground py-2 pr-4">{t.email}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {cls.map((c) => <Badge key={c.id} variant="outline">{c.name}</Badge>)}
                        {subs.map((s) => {
                          const c = CLASSES.find((x) => x.id === s.classId)!;
                          return <Badge key={s.id} variant="outline">{s.code} · {c.name}</Badge>;
                        })}
                        {!cls.length && !subs.length && <span className="text-muted-foreground text-xs">Unassigned</span>}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="ghost" className="gap-1">
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
