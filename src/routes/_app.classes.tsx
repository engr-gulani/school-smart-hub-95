import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, Users, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassFormDialog } from "@/components/class-form-dialog";
import { useAuth, can } from "@/lib/auth-context";
import { assignClassTeacher } from "@/lib/academics.functions";
import { useAcademics, useRefreshAcademics } from "@/lib/use-academics";

export const Route = createFileRoute("/_app/classes")({
  head: () => ({
    meta: [
      { title: "Classes · Greenfield College Portal" },
      { name: "description", content: "Classes, enrolment and class teacher assignments." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const assign = useServerFn(assignClassTeacher);

  const canAssign = can(user.role, "manage_school") || can(user.role, "assign_subjects");
  const canManage = can(user.role, "manage_school");
  const teachers = (data?.staff ?? []).filter((s) => s.role === "class_teacher" || s.role === "subject_teacher");

  const setTeacher = async (classId: string, value: string) => {
    try {
      await assign({ data: { classId, teacherId: value === "none" ? null : value } });
      toast.success("Class teacher updated");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update class teacher");
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading classes…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Classes</h1>
          <p className="text-muted-foreground text-sm">Enrolment per class and class teacher assignments.</p>
        </div>
        {canManage && (
          <ClassFormDialog
            onSaved={refresh}
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add class
              </Button>
            }
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.classes ?? []).map((c) => {
          const enrolled = (data?.students ?? []).filter((s) => s.classId === c.id).length;
          const subs = (data?.subjects ?? []).filter((s) => s.classId === c.id).length;
          return (
            <Card key={c.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="bg-gradient-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
                    <School className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.level}</Badge>
                    {canManage && (
                      <ClassFormDialog
                        initial={{ id: c.id, name: c.name, level: c.level }}
                        onSaved={refresh}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${c.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold">{c.name}</h3>
                {canAssign ? (
                  <Select value={c.classTeacherId ?? "none"} onValueChange={(v) => setTeacher(c.id, v)}>
                    <SelectTrigger className="mt-3 h-8 text-xs">
                      <SelectValue placeholder="Assign class teacher" />
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
                  <p className="text-muted-foreground mt-1 text-xs">
                    Class teacher: {c.classTeacherName ?? <span className="italic">Unassigned</span>}
                  </p>
                )}
                <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {enrolled} students
                  </span>
                  <span>{subs} subjects</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
