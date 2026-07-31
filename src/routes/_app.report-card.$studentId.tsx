import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";
import { SCHOOL, ordinal } from "@/lib/mock-data";
import { useAcademics, buildBroadsheet, stageFor, gradeFor, scoreTotals } from "@/lib/use-academics";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/report-card/$studentId")({
  head: () => ({
    meta: [
      { title: "Report card · Greenfield College Portal" },
      { name: "description", content: "Printable A4 term report card with grades, position and comments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportCard,
});

function ReportCard() {
  const { studentId } = Route.useParams();
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();

  if (isLoading) return <p className="text-muted-foreground py-16 text-center text-sm">Loading report card…</p>;

  const student = data?.students.find((s) => s.id === studentId);
  if (!student) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Student record not found.</div>
    );
  }

  // Students may only view their own report card, and only once published.
  if (user.role === "student") {
    if (data?.me.studentId !== student.id) return <Navigate to="/my-results" />;
    if (stageFor(data, student.classId) !== "published") return <Navigate to="/my-results" />;
  }

  const cls = data!.classes.find((c) => c.id === student.classId);
  const { subjects: classSubjects, rows } = buildBroadsheet(data, student.classId);
  const myRow = rows.find((r) => r.student.id === student.id) ?? {
    total: 0,
    average: 0,
    position: rows.length + 1,
  };
  const SCORES = data!.scores;

  


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        {user.role === "student" ? (
          <Link to="/my-results">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
        ) : (
          <Link to="/results">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
        )}

        <Button size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>
      </div>

      <article className="bg-card text-card-foreground shadow-card mx-auto max-w-[860px] rounded-xl border p-8 print:shadow-none print:border-0">
        <header className="flex items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-primary text-primary-foreground shadow-elegant flex h-14 w-14 items-center justify-center rounded-xl">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{SCHOOL.name}</h1>
              <p className="text-muted-foreground text-xs">{SCHOOL.address} · {SCHOOL.phone}</p>
              <p className="text-primary text-xs italic">{SCHOOL.motto}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Report card</p>
            <p className="font-display text-sm font-semibold">{SCHOOL.session}</p>
            <p className="text-muted-foreground text-xs">{SCHOOL.term}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Field label="Student" value={student.name} />
          <Field label="Admission #" value={student.admissionNo} mono />
          <Field label="Class" value={cls.name} />
          <Field label="Gender" value={student.gender} />
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Subject</th>
                <th className="px-2 py-2 text-center font-medium">CA</th>
                <th className="px-2 py-2 text-center font-medium">Exam</th>
                <th className="px-2 py-2 text-center font-medium">Total</th>
                <th className="px-2 py-2 text-center font-medium">Grade</th>
                <th className="px-3 py-2 text-left font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {classSubjects.map((sub) => {
                const sc = SCORES.find((x) => x.studentId === student.id && x.subjectId === sub.id);
                const { caTotal, total } = sc ? scoreTotals(sc) : { caTotal: 0, total: 0 };
                const g = gradeFor(total);
                return (
                  <tr key={sub.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{sub.name}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{caTotal}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{sc?.exam ?? 0}</td>
                    <td className="text-primary px-2 py-2 text-center font-semibold tabular-nums">{total}</td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade}</Badge>
                    </td>
                    <td className="text-muted-foreground px-3 py-2">{g.remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="Total score" value={myRow.total} />
          <Metric label="Average" value={myRow.average.toFixed(1)} />
          <Metric label="Position" value={ordinal(myRow.position)} accent />
          <Metric label="Overall grade" value={gradeFor(myRow.average).grade} accent />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Comment
            title="Class teacher's comment"
            body="A diligent student with steady improvement across core subjects. Keep up the reading habit."
            signer="Mrs. Grace Adewale"
          />
          <Comment
            title="Principal's comment"
            body="Very good performance this term. Aim higher next term — we believe in you."
            signer="Mr. Samuel Okoro"
          />
        </section>

        <footer className="text-muted-foreground mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs">
          <div>
            <p>Next term begins: <span className="text-foreground font-medium">{SCHOOL.nextTermBegins}</span></p>
            <p>Attendance: <span className="text-foreground font-medium">58 / 60 days</span> · Conduct: <span className="text-foreground font-medium">Excellent</span></p>
          </div>
          <div className="text-right">
            <div className="ring-border ml-auto grid h-14 w-14 place-items-center rounded-md ring-1">
              <div className="grid h-10 w-10 grid-cols-3 gap-[2px]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className={i % 2 === 0 ? "bg-foreground" : "bg-transparent"} />
                ))}
              </div>
            </div>
            <p className="mt-1 text-[10px]">Verify online</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "bg-gradient-primary text-primary-foreground border-transparent" : "bg-muted/40"}`}>
      <p className={`text-[10px] uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
      <p className="font-display mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Comment({ title, body, signer }: { title: string; body: string; signer: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{title}</p>
      <p className="mt-2 text-sm leading-relaxed">{body}</p>
      <p className="text-muted-foreground mt-4 border-t pt-2 text-xs italic">— {signer}</p>
    </div>
  );
}
