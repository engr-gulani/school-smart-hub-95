import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLASSES, SUBJECTS, USERS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/subjects")({
  head: () => ({ meta: [{ title: "Subjects · Greenfield College Portal" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const visible = user.role === "subject_teacher"
    ? SUBJECTS.filter((s) => user.subjectIds?.includes(s.id))
    : SUBJECTS;

  const byClass = CLASSES.map((c) => ({
    cls: c,
    subs: visible.filter((s) => s.classId === c.id),
  })).filter((g) => g.subs.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Subjects</h1>
        <p className="text-muted-foreground text-sm">
          {user.role === "subject_teacher"
            ? "Only subjects assigned to you are shown."
            : "All subjects across classes with assigned teachers."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {byClass.map(({ cls, subs }) => (
          <Card key={cls.id} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{cls.name}</CardTitle>
              <Badge variant="outline">{subs.length} subjects</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {subs.map((s) => {
                const t = USERS.find((u) => u.id === s.teacherId);
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-muted-foreground text-xs">Code {s.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{t?.name ?? "Unassigned"}</p>
                      <p className="text-muted-foreground text-xs">{t?.staffId ?? ""}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
