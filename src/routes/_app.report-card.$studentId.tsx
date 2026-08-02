import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { ReportCardSheet } from "@/components/report-card-sheet";
import { useAcademics, buildBroadsheet, stageFor } from "@/lib/use-academics";
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

  // Subject teachers may enter scores but never view report cards.
  if (user.role === "subject_teacher") {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        Report cards are not available for subject teacher accounts.
      </p>
    );
  }

  if (isLoading) return <p className="text-muted-foreground py-16 text-center text-sm">Loading report card…</p>;

  const student = data?.students.find((s) => s.id === studentId);
  if (!student) {
    return <div className="text-muted-foreground py-16 text-center text-sm">Student record not found.</div>;
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

  const editable =
    user.role === "class_teacher" ||
    user.role === "principal" ||
    user.role === "school_admin" ||
    user.role === "super_admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to={user.role === "student" ? "/my-results" : "/results"}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>

        <Button size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>
      </div>

      <ReportCardSheet
        student={student}
        data={data!}
        className={cls?.name}
        subjects={classSubjects}
        total={myRow.total}
        average={myRow.average}
        position={myRow.position}
        editable={editable}
      />
    </div>
  );
}
