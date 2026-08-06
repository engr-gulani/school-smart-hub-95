import { useEffect, useState } from "react";
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
  /** When true, comments, signatures and behavioural ratings can be edited. */
  editable?: boolean;
  /** Term the card is for. Defaults to the term in session. */
  termId?: string;
}

export const AFFECTIVE_TRAITS = [
  "Punctuality",
  "Neatness",
  "Politeness",
  "Honesty",
  "Attentiveness in class",
  "Relationship with others",
  "Self control",
] as const;

export const ACTIVITY_TRAITS = [
  "Sports / games",
  "Handwriting",
  "Musical skills",
  "Drawing & painting",
  "Club / society participation",
  "Leadership",
] as const;

export const RATING_SCALE: { value: number; label: string }[] = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Very good" },
  { value: 3, label: "Good" },
  { value: 2, label: "Fair" },
  { value: 1, label: "Needs improvement" },
];

export const ACADEMIC_GRADE_SCALE = [
  { grade: "A", range: "75 – 100", remark: "Excellent" },
  { grade: "B", range: "65 – 74", remark: "Very good" },
  { grade: "C", range: "55 – 64", remark: "Good" },
  { grade: "D", range: "45 – 54", remark: "Pass" },
  { grade: "E", range: "40 – 44", remark: "Fair" },
  { grade: "F", range: "0 – 39", remark: "Fail" },
];

interface Assessment {
  affective: Record<string, number>;
  activities: Record<string, number>;
  teacherComment: string;
  principalComment: string;
}

/** Turn "Mrs. Grace Adewale" into a short signature such as "G. Adewale". */
function signatureFor(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter((w) => !/^(mr|mrs|ms|miss|dr|prof)\.?$/i.test(w));
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

const DEFAULTS: Assessment = {
  affective: {},
  activities: {},
  teacherComment:
    "A diligent student with steady improvement across core subjects. Keep up the reading habit.",
  principalComment: "Very good performance this term. Aim higher next term — we believe in you.",
};

function storageKey(studentId: string) {
  return `report-card:${studentId}`;
}

function useAssessment(studentId: string) {
  const [state, setState] = useState<Assessment>(DEFAULTS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(studentId));
      setState(raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Assessment>) } : DEFAULTS);
    } catch {
      setState(DEFAULTS);
    }
  }, [studentId]);

  const update = (patch: Partial<Assessment>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(storageKey(studentId), JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  };

  return { state, update };
}

/** A single printable A4 report card sheet. */
export function ReportCardSheet({
  student,
  data,
  className,
  subjects,
  total,
  average,
  position,
  editable = false,
  termId,
}: Props) {
  const activeTermId = termId ?? data.settings.currentTermId ?? "";
  const term = data.terms.find((t) => t.id === activeTermId);
  const SCORES = data.scores.filter((s) => !activeTermId || s.termId === activeTermId);
  const { state, update } = useAssessment(`${student.id}:${activeTermId}`);


  // Names come straight from the accounts the admin creates, so reassigning a
  // class teacher or principal updates every report card automatically.
  const classTeacherName =
    data.classes.find((c) => c.id === student.classId)?.classTeacherName ?? "Unassigned";
  const principalName = data.staff.find((s) => s.role === "principal")?.name ?? "Unassigned";

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
          <p className="font-display text-sm font-semibold">{term?.session ?? SCHOOL.session}</p>
          <p className="text-muted-foreground text-xs">{term?.name ?? SCHOOL.term}</p>

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
        <RatingTable
          title="Affective assessment"
          traits={AFFECTIVE_TRAITS as unknown as string[]}
          values={state.affective}
          editable={editable}
          onChange={(trait, value) => update({ affective: { ...state.affective, [trait]: value } })}
        />
        <RatingTable
          title="Activities / psychomotor skills"
          traits={ACTIVITY_TRAITS as unknown as string[]}
          values={state.activities}
          editable={editable}
          onChange={(trait, value) => update({ activities: { ...state.activities, [trait]: value } })}
        />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Academic grade scale</p>
          <table className="mt-2 w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Grade</th>
                <th className="py-1 text-left font-medium">Score range</th>
                <th className="py-1 text-left font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {ACADEMIC_GRADE_SCALE.map((g) => (
                <tr key={g.grade} className="border-t">
                  <td className="py-1 font-semibold">{g.grade}</td>
                  <td className="py-1 tabular-nums">{g.range}</td>
                  <td className="text-muted-foreground py-1">{g.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Behavioural rating scale
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {RATING_SCALE.map((r) => (
              <li key={r.value} className="flex items-center justify-between border-t py-1 first:border-0">
                <span className="font-semibold tabular-nums">{r.value}</span>
                <span className="text-muted-foreground">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Comment
          title="Class teacher's comment"
          body={state.teacherComment}
          name={classTeacherName}
          sign={signatureFor(classTeacherName)}
          editable={editable}
          onChange={(patch) => update({ teacherComment: patch.body ?? state.teacherComment })}
        />
        <Comment
          title="Principal's comment"
          body={state.principalComment}
          name={principalName}
          sign={signatureFor(principalName)}
          editable={editable}
          onChange={(patch) => update({ principalComment: patch.body ?? state.principalComment })}
        />
      </section>

      <footer className="text-muted-foreground mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs">
        <div>
          <p>
            Next term begins: <span className="text-foreground font-medium">{data.settings.nextTermBegins ?? SCHOOL.nextTermBegins}</span>
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

function RatingTable({
  title,
  traits,
  values,
  editable,
  onChange,
}: {
  title: string;
  traits: string[];
  values: Record<string, number>;
  editable: boolean;
  onChange: (trait: string, value: number) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{title}</p>
      <table className="mt-2 w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">Trait</th>
            {RATING_SCALE.map((r) => (
              <th key={r.value} className="w-6 py-1 text-center font-medium tabular-nums">
                {r.value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {traits.map((trait) => {
            const current = values[trait] ?? 0;
            return (
              <tr key={trait} className="border-t">
                <td className="py-1 pr-2">{trait}</td>
                {RATING_SCALE.map((r) => (
                  <td key={r.value} className="py-1 text-center">
                    {editable ? (
                      <button
                        type="button"
                        aria-label={`${trait}: ${r.label}`}
                        onClick={() => onChange(trait, r.value)}
                        className={`mx-auto grid h-4 w-4 place-items-center rounded-sm border print:hidden ${
                          current === r.value ? "bg-primary border-primary text-primary-foreground" : ""
                        }`}
                      >
                        {current === r.value ? "✓" : ""}
                      </button>
                    ) : null}
                    <span className={editable ? "hidden print:inline" : ""}>
                      {current === r.value ? "✓" : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
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

function Comment({
  title,
  body,
  name,
  sign,
  editable,
  onChange,
}: {
  title: string;
  body: string;
  name: string;
  sign: string;
  editable: boolean;
  onChange: (patch: { body?: string }) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{title}</p>
      {editable ? (
        <textarea
          value={body}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={3}
          className="border-input bg-background focus-visible:ring-ring mt-2 w-full resize-y rounded-md border p-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 print:resize-none print:border-0 print:p-0"
        />
      ) : (
        <p className="mt-2 text-sm leading-relaxed">{body}</p>
      )}
      <div className="mt-4 flex items-end justify-between gap-3 border-t pt-2">
        <span className="text-muted-foreground text-xs">— {name}</span>
        <span className="text-xs italic">{sign}</span>
      </div>
    </div>
  );
}
