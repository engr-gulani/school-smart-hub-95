import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAcademics, buildBroadsheet, stageFor, gradeFor, scoreTotals } from "@/lib/use-academics";
import { ordinal, SCHOOL } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/my-results")({
  head: () => ({
    meta: [
      { title: "My results · Student portal" },
      { name: "description", content: "Your published term results, grades and class position." },
    ],
  }),
  component: MyResults,
});

function MyResults() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();

  if (isLoading) {
    return <p className="text-muted-foreground py-16 text-center text-sm">Loading your results…</p>;
  }

  const studentId = data?.me.studentId ?? null;
  const student = data?.students.find((s) => s.id === studentId);

  if (!student) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">No student record linked</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your account isn't linked to a student record yet. Please contact the school administrator.
        </p>
      </div>
    );
  }

  const cls = data!.classes.find((c) => c.id === student.classId);
  const published = stageFor(data, student.classId) === "published";

  if (!published) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Lock className="text-muted-foreground h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Results not yet published</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your class results are still under review. You'll be notified as soon as they are released by the Principal.
        </p>
      </div>
    );
  }

  const { subjects, rows } = buildBroadsheet(data, student.classId);
  const myRow = rows.find((r) => r.student.id === student.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My results</h1>
          <p className="text-muted-foreground text-sm">
            {cls?.name ?? student.classId} · {SCHOOL.term} · Published
          </p>
        </div>
        <Link to="/report-card/$studentId" params={{ studentId: student.id }}>
          <Button size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Download report card
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total" value={myRow?.total ?? 0} />
        <MetricCard label="Average" value={(myRow?.average ?? 0).toFixed(1)} />
        <MetricCard label="Position" value={myRow ? ordinal(myRow.position) : "—"} accent />
        <MetricCard label="Overall grade" value={gradeFor(myRow?.average ?? 0).grade} accent />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Subject-by-subject performance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium">Subject</th>
                <th className="py-2 pr-3 text-center font-medium">1st CA /20</th>
                <th className="py-2 pr-3 text-center font-medium">2nd CA /10</th>
                <th className="py-2 pr-3 text-center font-medium">Assign /10</th>
                <th className="py-2 pr-3 text-center font-medium">Exam /60</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 text-right font-medium">Grade</th>
                <th className="py-2 text-left font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub) => {
                const sc = data!.scores.find((x) => x.studentId === student.id && x.subjectId === sub.id);
                const total = sc ? scoreTotals(sc).total : 0;
                const g = gradeFor(total);
                return (
                  <tr key={sub.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{sub.name}</td>
                    <td className="py-2 pr-3 text-center tabular-nums">{sc?.ca1 ?? 0}</td>
                    <td className="py-2 pr-3 text-center tabular-nums">{sc?.ca2 ?? 0}</td>
                    <td className="py-2 pr-3 text-center tabular-nums">{sc?.assignment ?? 0}</td>
                    <td className="py-2 pr-3 text-center tabular-nums">{sc?.exam ?? 0}</td>
                    <td className="text-primary py-2 pr-3 text-right font-semibold tabular-nums">{total}</td>
                    <td className="py-2 pr-3 text-right">
                      <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade}</Badge>
                    </td>
                    <td className="text-muted-foreground py-2">{g.remark}</td>
                  </tr>
                );
              })}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted-foreground py-8 text-center text-sm">
                    No subjects registered for your class yet.
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

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={accent ? "bg-gradient-primary text-primary-foreground shadow-card" : "shadow-card"}>
      <CardContent className="p-5">
        <p className={`text-xs uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}>
          {label}
        </p>
        <p className="font-display mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
