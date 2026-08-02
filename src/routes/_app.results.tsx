import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, FileText, Printer, CheckCircle2, Circle, Undo2, Download } from "lucide-react";
import { useAuth, can } from "@/lib/auth-context";
import { updateResultApproval } from "@/lib/academics.functions";
import {
  buildBroadsheet,
  gradeFor,
  stageFor,
  useAcademics,
  useRefreshAcademics,
  STAGE_LABEL,
  STAGE_ORDER,
} from "@/lib/use-academics";

export const Route = createFileRoute("/_app/results")({
  head: () => ({
    meta: [
      { title: "Results & broadsheet · Greenfield College Portal" },
      { name: "description", content: "Class broadsheets, positions and the result approval workflow." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const advance = useServerFn(updateResultApproval);
  const [classId, setClassId] = useState("c-ss1a");
  const [busy, setBusy] = useState(false);

  const stage = stageFor(data, classId);
  const { subjects, rows } = useMemo(() => buildBroadsheet(data, classId), [data, classId]);

  const classAvg = rows.length ? Math.round((rows.reduce((a, r) => a + r.average, 0) / rows.length) * 10) / 10 : 0;
  const passed = rows.filter((r) => r.average >= 50).length;
  const passRate = rows.length ? Math.round((passed / rows.length) * 100) : 0;

  const act = async (action: "submit" | "vp_approve" | "principal_approve" | "publish" | "reset", msg: string) => {
    setBusy(true);
    try {
      await advance({ data: { classId, action } });
      toast.success(msg);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading results…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Results & broadsheet</h1>
          <p className="text-muted-foreground text-sm">Auto-computed totals, positions and grade distribution.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(data?.classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/report-cards/$classId" params={{ classId }} search={{ print: "1" }} target="_blank">
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Download all report cards (PDF)
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="shadow-card border-primary/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-2">
              {STAGE_ORDER.map((s, i) => {
                const reached = STAGE_ORDER.indexOf(stage) >= i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    {reached ? (
                      <CheckCircle2 className="text-primary h-4 w-4" />
                    ) : (
                      <Circle className="text-muted-foreground/50 h-4 w-4" />
                    )}
                    {i < STAGE_ORDER.length - 1 && (
                      <span className={`h-px w-6 ${reached ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Approval workflow
              </p>
              <p className="text-sm font-medium">{STAGE_LABEL[stage]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {stage === "draft" && can(user.role, "enter_scores") && (
              <Button size="sm" disabled={busy} onClick={() => act("submit", "Submitted to the Vice Principal")}>
                Submit for approval
              </Button>
            )}
            {stage === "vp_review" && can(user.role, "vp_approve") && (
              <Button size="sm" disabled={busy} className="gap-2" onClick={() => act("vp_approve", "Approved — sent to the Principal")}>
                <FileCheck2 className="h-4 w-4" /> VP approve
              </Button>
            )}
            {stage === "principal_review" && can(user.role, "principal_approve") && (
              <Button size="sm" disabled={busy} className="gap-2" onClick={() => act("principal_approve", "Principal approval recorded")}>
                <FileCheck2 className="h-4 w-4" /> Principal approve
              </Button>
            )}
            {stage === "approved" && can(user.role, "principal_approve") && (
              <Button size="sm" disabled={busy} className="gap-2" onClick={() => act("publish", "Results published to students")}>
                <FileCheck2 className="h-4 w-4" /> Publish results
              </Button>
            )}
            {stage === "published" && (
              <Badge className="bg-success/15 text-success border-success/30">Published</Badge>
            )}
            {stage !== "draft" && (can(user.role, "vp_approve") || can(user.role, "principal_approve")) && (
              <Button size="sm" variant="outline" disabled={busy} className="gap-2" onClick={() => act("reset", "Returned to the teacher for corrections")}>
                <Undo2 className="h-4 w-4" /> Return to teacher
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Class average</p>
            <p className="font-display mt-1 text-3xl font-semibold">{classAvg}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Pass rate</p>
            <p className="font-display text-success mt-1 text-3xl font-semibold">{passRate}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Top student</p>
            <p className="font-display mt-1 text-lg font-semibold">{rows[0]?.student.name ?? "—"}</p>
            <p className="text-muted-foreground text-xs">Total {rows[0]?.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            Broadsheet · {data?.classes.find((c) => c.id === classId)?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Student</th>
                {subjects.map((s) => (
                  <th key={s.id} className="py-2 pr-3 text-center font-medium">
                    {s.code}
                  </th>
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
                      <td key={p.subjectId} className="py-2 pr-3 text-center tabular-nums">
                        {p.total}
                      </td>
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
              {!rows.length && (
                <tr>
                  <td colSpan={6 + subjects.length} className="text-muted-foreground py-8 text-center text-sm">
                    No students in this class yet.
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
