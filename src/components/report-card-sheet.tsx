import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { SCHOOL, ordinal } from "@/lib/mock-data";
import { gradeFor, scoreTotals, type Academics, type ApiStudent } from "@/lib/use-academics";

interface Props {
  student: ApiStudent;
  data: Academics;
  className?: string;
  subjects: { id: string; name: string }[];
  total: number;
  average: number;
  position: number;
}

/** A single printable A4 report card sheet. */
export function ReportCardSheet({ student, data, className, subjects, total, average, position }: Props) {
  const SCORES = data.scores;

  return (
    <article className="bg-card text-card-foreground shadow-card mx-auto max-w-[860px] rounded-xl border p-8 print:break-after-page print:border-0 print:shadow-none">
      <header className="flex items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary text-primary-foreground shadow-elegant flex h-14 w-14 items-center justify-center rounded-xl">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{SCHOOL.name}</h2>
            <p className="text-muted-foreground text-xs">
              {SCHOOL.address} · {SCHOOL.phone}
            </p>
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
        <Field label="Class" value={className ?? student.classId} />
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
            {subjects.map((sub) => {
              const sc = SCORES.find((x) => x.studentId === student.id && x.subjectId === sub.id);
              const { caTotal, total: subTotal } = sc ? scoreTotals(sc) : { caTotal: 0, total: 0 };
              const g = gradeFor(subTotal);
              return (
                <tr key={sub.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{sub.name}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{caTotal}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{sc?.exam ?? 0}</td>
                  <td className="text-primary px-2 py-2 text-center font-semibold tabular-nums">{subTotal}</td>
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
        <Metric label="Total score" value={total} />
        <Metric label="Average" value={average.toFixed(1)} />
        <Metric label="Position" value={ordinal(position)} accent />
        <Metric label="Overall grade" value={gradeFor(average).grade} accent />
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
          <p>
            Next term begins: <span className="text-foreground font-medium">{SCHOOL.nextTermBegins}</span>
          </p>
          <p>
            Attendance: <span className="text-foreground font-medium">58 / 60 days</span> · Conduct:{" "}
            <span className="text-foreground font-medium">Excellent</span>
          </p>
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
    <div
      className={`rounded-lg border p-3 ${accent ? "bg-gradient-primary text-primary-foreground border-transparent" : "bg-muted/40"}`}
    >
      <p className={`text-[10px] uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}>
        {label}
      </p>
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
