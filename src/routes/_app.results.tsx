import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileCheck2, FileText, Printer, CheckCircle2, Circle } from "lucide-react";
import { CLASSES, classBroadsheet, gradeFor } from "@/lib/mock-data";
import { useAuth, can } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/results")({
  head: () => ({ meta: [{ title: "Results & broadsheet · Greenfield College Portal" }] }),
  component: ResultsPage,
});

type WorkflowStage = "draft" | "vp_review" | "principal_review" | "approved" | "published";
const STAGE_ORDER: WorkflowStage[] = ["draft", "vp_review", "principal_review", "approved", "published"];
const STAGE_LABEL: Record<WorkflowStage, string> = {
  draft: "Draft — scores in progress",
  vp_review: "Submitted · Awaiting VP (Academic)",
  principal_review: "VP approved · Awaiting Principal",
  approved: "Principal approved · Ready to publish",
  published: "Published to parents & report cards",
};

function ResultsPage() {
  const { user } = useAuth();
  const [classId, setClassId] = useState("c-ss1a");
  const [workflow, setWorkflow] = useState<Record<string, WorkflowStage>>({ "c-ss1a": "vp_review" });
  const stage: WorkflowStage = workflow[classId] ?? "draft";
  const setStage = (s: WorkflowStage) => setWorkflow((w) => ({ ...w, [classId]: s }));
  const { subjects, rows } = useMemo(() => classBroadsheet(classId), [classId]);

  const classAvg = rows.length ? Math.round((rows.reduce((a, r) => a + r.average, 0) / rows.length) * 10) / 10 : 0;
  const passed = rows.filter((r) => r.average >= 50).length;
  const passRate = rows.length ? Math.round((passed / rows.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Results & broadsheet</h1>
          <p className="text-muted-foreground text-sm">Auto-computed totals, positions and grade distribution.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button variant="outline" size="sm" className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          {can(user.role, "publish_results") && (
            <Button size="sm" className="gap-2"><FileCheck2 className="h-4 w-4" /> Publish results</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card"><CardContent className="p-5">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Class average</p>
          <p className="font-display mt-1 text-3xl font-semibold">{classAvg}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Pass rate</p>
          <p className="font-display text-success mt-1 text-3xl font-semibold">{passRate}%</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Top student</p>
          <p className="font-display mt-1 text-lg font-semibold">{rows[0]?.student.name ?? "—"}</p>
          <p className="text-muted-foreground text-xs">Total {rows[0]?.total ?? 0}</p>
        </CardContent></Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Broadsheet · {CLASSES.find((c) => c.id === classId)?.name}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Student</th>
                {subjects.map((s) => (
                  <th key={s.id} className="py-2 pr-3 text-center font-medium">{s.code}</th>
                ))}
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 text-right font-medium">Avg</th>
                <th className="py-2 pr-3 text-right font-medium">Grade</th>
                <th className="py-2 pr-3 text-right font-medium">Pos</th>
                <th className="py-2 text-right font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const g = gradeFor(r.average);
                return (
                  <tr key={r.student.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="text-muted-foreground py-2 pr-3">{r.position}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium">{r.student.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{r.student.admissionNo}</p>
                    </td>
                    {r.perSubject.map((p) => (
                      <td key={p.subjectId} className="py-2 pr-3 text-center tabular-nums">{p.total}</td>
                    ))}
                    <td className="text-primary py-2 pr-3 text-right font-semibold tabular-nums">{r.total}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.average.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-right">
                      <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.position}</td>
                    <td className="py-2 text-right">
                      <Link to="/report-card/$studentId" params={{ studentId: r.student.id }}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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
