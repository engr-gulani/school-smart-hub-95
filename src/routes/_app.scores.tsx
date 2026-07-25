import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Save } from "lucide-react";
import { CLASSES, SCORES, STUDENTS, SUBJECTS, gradeFor, scoreTotals } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/scores")({
  head: () => ({ meta: [{ title: "Score entry · Greenfield College Portal" }] }),
  component: ScoresPage,
});

function ScoresPage() {
  const { user } = useAuth();
  const available = user.role === "subject_teacher"
    ? SUBJECTS.filter((s) => user.subjectIds?.includes(s.id))
    : SUBJECTS;

  const [subjectId, setSubjectId] = useState<string>(available[0]?.id ?? "");
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const classInfo = CLASSES.find((c) => c.id === subject?.classId);
  const roster = useMemo(
    () => STUDENTS.filter((s) => s.classId === subject?.classId),
    [subject?.classId],
  );

  const [draft, setDraft] = useState<Record<string, { ca1: number; ca2: number; assignment: number; practical: number; exam: number }>>(() => {
    const map: Record<string, any> = {};
    for (const st of roster) {
      const sc = SCORES.find((x) => x.studentId === st.id && x.subjectId === subject?.id);
      map[st.id] = sc ? { ca1: sc.ca1, ca2: sc.ca2, assignment: sc.assignment, practical: sc.practical, exam: sc.exam } : { ca1: 0, ca2: 0, assignment: 0, practical: 0, exam: 0 };
    }
    return map;
  });

  // Recompute draft when subject changes
  useMemo(() => {
    const map: Record<string, any> = {};
    for (const st of roster) {
      const sc = SCORES.find((x) => x.studentId === st.id && x.subjectId === subject?.id);
      map[st.id] = sc ? { ca1: sc.ca1, ca2: sc.ca2, assignment: sc.assignment, practical: sc.practical, exam: sc.exam } : { ca1: 0, ca2: 0, assignment: 0, practical: 0, exam: 0 };
    }
    setDraft(map);
  }, [subjectId]); // eslint-disable-line

  const update = (studentId: string, key: string, val: number) => {
    setDraft((d) => ({ ...d, [studentId]: { ...d[studentId], [key]: Math.max(0, Math.min(100, val || 0)) } }));
  };

  if (!subject) {
    return <p className="text-muted-foreground text-sm">No subjects assigned to you.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Score entry</h1>
          <p className="text-muted-foreground text-sm">
            Enter CA, assignment, practical and exam scores. Totals, grades and remarks compute automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Template</Button>
          <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Bulk upload</Button>
          <Button size="sm" className="gap-2"><Save className="h-4 w-4" /> Save draft</Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">{subject.name} — {classInfo?.name}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              CA1 (max 20) · CA2 (max 20) · Assignment (max 10) · Practical (max 10) · Exam (max 60) · Total 100
            </p>
          </div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {available.map((s) => {
                const c = CLASSES.find((x) => x.id === s.classId)!;
                return <SelectItem key={s.id} value={s.id}>{s.name} · {c.name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">CA1</th>
                <th className="py-2 pr-3 font-medium">CA2</th>
                <th className="py-2 pr-3 font-medium">Assign.</th>
                <th className="py-2 pr-3 font-medium">Practical</th>
                <th className="py-2 pr-3 font-medium">Exam</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((st) => {
                const d = draft[st.id];
                const total = d.ca1 + d.ca2 + d.assignment + d.practical + d.exam;
                const g = gradeFor(total);
                return (
                  <tr key={st.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{st.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{st.admissionNo}</p>
                    </td>
                    {(["ca1", "ca2", "assignment", "practical", "exam"] as const).map((k) => (
                      <td key={k} className="py-2 pr-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={d[k]}
                          onChange={(e) => update(st.id, k, Number(e.target.value))}
                          className="h-8 w-16 tabular-nums"
                        />
                      </td>
                    ))}
                    <td className="text-primary py-2 pr-3 text-right text-sm font-semibold tabular-nums">{total}</td>
                    <td className="py-2 text-right">
                      <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade} · {g.remark}</Badge>
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
