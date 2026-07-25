import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, School, Users } from "lucide-react";
import { CLASSES, STUDENTS, SUBJECTS, USERS } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/classes")({
  head: () => ({ meta: [{ title: "Classes · Greenfield College Portal" }] }),
  component: ClassesPage,
});

function ClassesPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Classes</h1>
          <p className="text-muted-foreground text-sm">Create classes, assign class teachers and view enrollment.</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New class</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASSES.map((c) => {
          const enrolled = STUDENTS.filter((s) => s.classId === c.id).length;
          const subs = SUBJECTS.filter((s) => s.classId === c.id).length;
          const teacher = USERS.find((u) => u.id === c.classTeacherId);
          return (
            <Card key={c.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="bg-gradient-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
                    <School className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{c.level}</Badge>
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold">{c.name}</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Class teacher: {teacher?.name ?? <span className="italic">Unassigned</span>}
                </p>
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
