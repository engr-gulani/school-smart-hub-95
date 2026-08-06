import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { ReportCardSheet } from "@/components/report-card-sheet";
import { buildBroadsheet, useAcademics } from "@/lib/use-academics";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/report-cards/$classId")({
  validateSearch: (search: Record<string, unknown>) => ({
    print: typeof search['print'] === "string" ? (search['print'] as string) : undefined,
    term: typeof search['term'] === "string" ? (search['term'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Bulk report cards · Greenfield College Portal" },
      { name: "description", content: "Download every student's A4 report card for a class as a single PDF." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BulkReportCards,
});

function BulkReportCards() {
  const { classId } = Route.useParams();
  const { print, term } = Route.useSearch();
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const printed = useRef(false);

  const termId = term ?? data?.settings.currentTermId ?? "";
  const { subjects, rows } = useMemo(() => buildBroadsheet(data, classId, termId), [data, classId, termId]);
  const cls = data?.classes.find((c) => c.id === classId);

  const autoPrint = print === "1";


  useEffect(() => {
    if (!isLoading && autoPrint && !printed.current && rows.length > 0) {
      printed.current = true;
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
    return;
  }, [isLoading, autoPrint, rows.length]);

  if (user.role === "student" || user.role === "subject_teacher") {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        Report cards are not available for this account type.
      </p>
    );
  }

  const editable =
    user.role === "class_teacher" ||
    user.role === "principal" ||
    user.role === "school_admin" ||
    user.role === "super_admin";
  if (isLoading) return <p className="text-muted-foreground py-16 text-center text-sm">Preparing report cards…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/results">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {rows.length} report card{rows.length === 1 ? "" : "s"} · {cls?.name ?? classId}
          </p>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Download all as PDF
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">No students in this class yet.</p>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {rows.map((r) => (
            <ReportCardSheet
              key={r.student.id}
              student={r.student}
              data={data!}
              className={cls?.name}
              subjects={subjects}
              total={r.total}
              average={r.average}
              position={r.position}
              editable={editable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
