import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, can } from "@/lib/auth-context";
import { assignSubjectTeacher } from "@/lib/academics.functions";
import { useAcademics, useRefreshAcademics } from "@/lib/use-academics";

export const Route = createFileRoute("/_app/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects · Greenfield College Portal" },
      { name: "description", content: "Subjects per class and the teachers assigned to teach them." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const assign = useServerFn(assignSubjectTeacher);

  const canAssign = can(user.role, "manage_school") || can(user.role, "assign_subjects");
  const teachers = (data?.staff ?? []).filter((s) => s.role === "subject_teacher" || s.role === "class_teacher");

  const visible =
    user.role === "subject_teacher"
      ? (data?.subjects ?? []).filter((s) => s.teacherId === user.id)
      : (data?.subjects ?? []);

  const byClass = (data?.classes ?? [])
    .map((c) => ({ cls: c, subs: visible.filter((s) => s.classId === c.id) }))
    .filter((g) => g.subs.length > 0);

  const setTeacher = async (subjectId: string, value: string) => {
    try {
      await assign({ data: { subjectId, teacherId: value === "none" ? null : value } });
      toast.success("Subject teacher updated");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update subject teacher");
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading subjects…</p>;

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
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-muted-foreground text-xs">Code {s.code}</p>
                  </div>
                  {canAssign ? (
                    <Select value={s.teacherId ?? "none"} onValueChange={(v) => setTeacher(s.id, v)}>
                      <SelectTrigger className="h-8 w-56 text-xs">
                        <SelectValue placeholder="Assign teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm">{s.teacherName ?? "Unassigned"}</p>
                      <p className="text-muted-foreground text-xs">{s.teacherStaffId ?? ""}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {!byClass.length && (
          <p className="text-muted-foreground text-sm">No subjects assigned to you yet.</p>
        )}
      </div>
    </div>
  );
}
