import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Send, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveSubjectScores, updateResultApproval } from "@/lib/academics.functions";
import {
  currentTerm,
  gradeFor,
  stageFor,
  subjectsForTeacher,
  useAcademics,
  useRefreshAcademics,
  STAGE_LABEL,
} from "@/lib/use-academics";


export const Route = createFileRoute("/_app/scores")({
  head: () => ({
    meta: [
      { title: "Score entry · Greenfield College Portal" },
      { name: "description", content: "Enter CA, assignment and exam scores with live totals and grades." },
    ],
  }),
  component: ScoresPage,
});

type Draft = Record<string, { ca1: number; ca2: number; assignment: number; exam: number }>;
const MAX: Record<string, number> = { ca1: 20, ca2: 10, assignment: 10, exam: 60 };

function ScoresPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const save = useServerFn(saveSubjectScores);
  const advance = useServerFn(updateResultApproval);

  const term = currentTerm(data);
  const allTerms = useMemo(
    () => (data?.terms ?? []).slice().sort((a, b) => (a.session + a.sortOrder).localeCompare(b.session + b.sortOrder)),
    [data],
  );
  const [termId, setTermId] = useState("");
  useEffect(() => {
    if (!termId && term.id) setTermId(term.id);
  }, [term.id, termId]);
  const viewTerm = allTerms.find((t) => t.id === termId);
  const isCurrentTerm = !!term.id && termId === term.id && term.isOpen;

  const available = useMemo(
    () => subjectsForTeacher(data, user.id, user.role),
    [data, user.id, user.role],
  );

  const [subjectId, setSubjectId] = useState("");
  useEffect(() => {
    if (!subjectId && available.length) setSubjectId(available[0].id);
  }, [available, subjectId]);

  const subject = available.find((s) => s.id === subjectId) ?? data?.subjects.find((s) => s.id === subjectId);
  const classInfo = data?.classes.find((c) => c.id === subject?.classId);
  const stage = stageFor(data, subject?.classId ?? "", termId);
  const isPrivileged = user.role === "school_admin" || user.role === "super_admin";
  const locked = (!isCurrentTerm || stage !== "draft") && !isPrivileged;

  const roster = useMemo(
    () => (data?.students ?? []).filter((s) => s.classId === subject?.classId),
    [data, subject?.classId],
  );

  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data || !subject) return;
    const map: Draft = {};
    for (const st of roster) {
      const sc = data.scores.find(
        (x) => x.studentId === st.id && x.subjectId === subject.id && (!termId || x.termId === termId),
      );
      map[st.id] = sc
        ? { ca1: sc.ca1, ca2: sc.ca2, assignment: sc.assignment, exam: sc.exam }
        : { ca1: 0, ca2: 0, assignment: 0, exam: 0 };
    }
    setDraft(map);
  }, [data, subject?.id, roster, termId]);


  const update = (studentId: string, key: string, val: number) => {
    const max = MAX[key] ?? 100;
    setDraft((d) => ({
      ...d,
      [studentId]: { ...d[studentId], [key]: Math.max(0, Math.min(max, Math.round(val || 0))) },
    }));
  };

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      const entries = roster.map((st) => ({ studentId: st.id, ...(draft[st.id] ?? { ca1: 0, ca2: 0, assignment: 0, exam: 0 }) }));
      const res = await save({ data: { subjectId: subject.id, entries } });
      toast.success(`Saved ${res.saved} score entries`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save scores");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject) return;
    try {
      await advance({ data: { classId: subject.classId, action: "submit" } });
      toast.success("Results submitted to the Vice Principal for approval");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit results");
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading your subjects…</p>;
  }

  if (!subject) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Score entry</h1>
        <p className="text-muted-foreground text-sm">
          No subjects are assigned to you yet. Ask the Vice Principal (Academic) or an administrator to assign
          you a subject on the Subjects page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Score entry</h1>
          <p className="text-muted-foreground text-sm">
            Enter CA, assignment and exam scores. Totals and grades compute automatically and save to the portal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving || locked}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save scores
          </Button>
          {stage === "draft" && (
            <Button size="sm" variant="outline" className="gap-2" onClick={handleSubmit}>
              <Send className="h-4 w-4" /> Submit for approval
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">
              {subject.name} — {classInfo?.name}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              CA1 (max 20) · CA2 (max 10) · Assignment (max 10) · Exam (max 60) · Total 100
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{STAGE_LABEL[stage]}</p>
          </div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => {
                const c = data?.classes.find((x) => x.id === s.classId);
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {c?.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {locked && (
            <p className="text-muted-foreground mb-3 flex items-center gap-2 rounded-md border p-2 text-xs">
              <Lock className="h-3.5 w-3.5" /> These scores are locked — the class result is already in the
              approval workflow.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">CA1 /20</th>
                <th className="py-2 pr-3 font-medium">CA2 /10</th>
                <th className="py-2 pr-3 font-medium">Assign. /10</th>
                <th className="py-2 pr-3 font-medium">Exam /60</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((st) => {
                const d = draft[st.id] ?? { ca1: 0, ca2: 0, assignment: 0, exam: 0 };
                const total = d.ca1 + d.ca2 + d.assignment + d.exam;
                const g = gradeFor(total);
                return (
                  <tr key={st.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{st.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{st.admissionNo}</p>
                    </td>
                    {(["ca1", "ca2", "assignment", "exam"] as const).map((k) => (
                      <td key={k} className="py-2 pr-3">
                        <Input
                          type="number"
                          min={0}
                          max={MAX[k]}
                          value={d[k]}
                          disabled={locked}
                          onChange={(e) => update(st.id, k, Number(e.target.value))}
                          className="h-8 w-16 tabular-nums"
                        />
                      </td>
                    ))}
                    <td className="text-primary py-2 pr-3 text-right text-sm font-semibold tabular-nums">{total}</td>
                    <td className="py-2 text-right">
                      <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>
                        {g.grade} · {g.remark}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!roster.length && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                    No students enrolled in this class yet.
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
