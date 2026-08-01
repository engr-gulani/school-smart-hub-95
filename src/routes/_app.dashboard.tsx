import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  GraduationCap,
  BookOpen,
  School as SchoolIcon,
  ClipboardCheck,
  FileCheck2,
  Bell,
  TrendingUp,
  CalendarCheck2,
  FileText,
  Award,
  UserPlus,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth, can } from "@/lib/auth-context";
import { SCHOOL, ordinal, attendanceFor } from "@/lib/mock-data";
import {
  useAcademics,
  buildBroadsheet,
  gradeFor,
  stageFor,
  STAGE_LABEL,
  type Academics,
} from "@/lib/use-academics";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Greenfield College Portal" },
      { name: "description", content: "Role-specific overview of academic activity, results and pending tasks." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();

  if (user.role === "student") return <StudentDashboard data={data} isLoading={isLoading} />;

  const classes = data?.classes ?? [];
  const subjects = data?.subjects ?? [];
  const students = data?.students ?? [];
  const scores = data?.scores ?? [];
  const staff = data?.staff ?? [];

  const teacherCount = staff.filter(
    (s) => s.role === "subject_teacher" || s.role === "class_teacher",
  ).length;
  const isTeacherView = user.role === "subject_teacher" || user.role === "class_teacher";

  const assignedSubjects = subjects.filter(
    (s) => s.teacherId === user.id || (user.role === "class_teacher" && (user.classIds ?? []).includes(s.classId)),
  );
  const assignedClasses = classes.filter((c) => c.classTeacherId === user.id);
  const scopeClassIds = new Set([
    ...assignedSubjects.map((s) => s.classId),
    ...assignedClasses.map((c) => c.id),
  ]);
  const studentsInScope = isTeacherView ? students.filter((st) => scopeClassIds.has(st.classId)) : students;

  const pendingUploads = assignedSubjects.filter((sub) => {
    const roster = students.filter((st) => st.classId === sub.classId);
    const entered = scores.filter((sc) => sc.subjectId === sub.id).length;
    return roster.length > 0 && entered < roster.length;
  });

  const snapshotClassId = (isTeacherView ? [...scopeClassIds][0] : undefined) ?? classes[0]?.id ?? "";
  const snapshotClass = classes.find((c) => c.id === snapshotClassId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {SCHOOL.session} · {SCHOOL.term}
          </p>
          <h1 className="font-display text-3xl font-semibold">Welcome back, {user.name.split(" ").slice(-1)[0]}.</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Loading live school data…"
              : isTeacherView
                ? "Here are your assigned subjects and pending score uploads."
                : "Here's the pulse of the school this term."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can(user.role, "manage_school") && (
            <Link to="/users">
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" /> Create user account
              </Button>
            </Link>
          )}
          <Badge variant="secondary" className="w-fit">
            Next term begins {SCHOOL.nextTermBegins}
          </Badge>
        </div>
      </div>

      {isTeacherView ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assigned Subjects" value={assignedSubjects.length} icon={BookOpen} />
          <StatCard label="Assigned Classes" value={scopeClassIds.size} icon={SchoolIcon} accent="success" />
          <StatCard label="Students in scope" value={studentsInScope.length} icon={Users} accent="muted" />
          <StatCard
            label="Pending uploads"
            value={pendingUploads.length}
            hint={pendingUploads[0] ? `Incomplete: ${pendingUploads[0].code}` : "All scores entered"}
            icon={ClipboardCheck}
            accent="warning"
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={students.length} icon={Users} />
          <StatCard label="Teachers" value={teacherCount} icon={GraduationCap} accent="success" />
          <StatCard label="Classes" value={classes.length} icon={SchoolIcon} accent="muted" />
          <StatCard label="Subjects" value={subjects.length} icon={BookOpen} accent="warning" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {snapshotClass?.name ?? "Class"} · Live broadsheet snapshot
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">Auto-computed totals & positions from the database</p>
            </div>
            <Link to="/results" className="text-primary text-xs font-medium hover:underline">
              View full broadsheet →
            </Link>
          </CardHeader>
          <CardContent>
            <SnapshotBroadsheet data={data} classId={snapshotClassId} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Result workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {classes.slice(0, 6).map((c) => {
              const stage = stageFor(data, c.id);
              const Icon = stage === "published" ? TrendingUp : stage === "draft" ? ClipboardCheck : FileCheck2;
              return (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="bg-accent text-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium">{c.name}</p>
                    <p className="text-muted-foreground text-xs">{STAGE_LABEL[stage]}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-muted-foreground pt-2 text-[11px]">
              {scores.length} score entries recorded this term.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SnapshotBroadsheet({ data, classId }: { data: Academics | undefined; classId: string }) {
  const { subjects, rows } = buildBroadsheet(data, classId);
  const top = rows.slice(0, 5);
  if (top.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No results recorded for this class yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Student</th>
            {subjects.map((s) => (
              <th key={s.id} className="py-2 text-center font-medium">
                {s.code}
              </th>
            ))}
            <th className="py-2 text-right font-medium">Total</th>
            <th className="py-2 text-right font-medium">Pos</th>
          </tr>
        </thead>
        <tbody>
          {top.map((row) => (
            <tr key={row.student.id} className="border-b last:border-0">
              <td className="text-muted-foreground py-2">{row.position}</td>
              <td className="py-2 font-medium">{row.student.name}</td>
              {row.perSubject.map((p) => (
                <td key={p.subjectId} className="py-2 text-center tabular-nums">
                  {p.total}
                </td>
              ))}
              <td className="text-primary py-2 text-right font-semibold tabular-nums">{row.total}</td>
              <td className="py-2 text-right tabular-nums">{row.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentDashboard({ data, isLoading }: { data: Academics | undefined; isLoading: boolean }) {
  const { user } = useAuth();
  const student = (data?.students ?? []).find((s) => s.id === user.studentId || s.userId === user.id);

  if (isLoading) {
    return <div className="text-muted-foreground py-16 text-center text-sm">Loading your portal…</div>;
  }
  if (!student) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No student record linked to this account. Please contact the administrator.
      </div>
    );
  }
  const cls = (data?.classes ?? []).find((c) => c.id === student.classId);
  const attendance = attendanceFor(student.id);
  const stage = stageFor(data, student.classId);
  const published = stage === "published";
  const { rows } = buildBroadsheet(data, student.classId);
  const myRow = rows.find((r) => r.student.id === student.id);
  const classSubjects = (data?.subjects ?? []).filter((s) => s.classId === student.classId);
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const attendancePct = Math.round((attendance.present / attendance.total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {SCHOOL.session} · {SCHOOL.term}
        </p>
        <h1 className="font-display text-3xl font-semibold">Welcome back, {student.name.split(" ")[0]}.</h1>
        <p className="text-muted-foreground text-sm">Here's your personalized student portal.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <div className="bg-gradient-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">{student.name}</p>
            <p className="text-muted-foreground text-sm">
              {cls?.name ?? student.classId} · {student.gender}
            </p>
            <p className="text-muted-foreground font-mono text-xs">{student.admissionNo}</p>
          </div>
          <Badge variant="secondary" className="w-fit">
            Next term begins {SCHOOL.nextTermBegins}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${attendancePct}%`} hint={`${attendance.present}/${attendance.total} days`} icon={CalendarCheck2} accent="success" />
        <StatCard label="Overall average" value={published && myRow ? myRow.average.toFixed(1) : "—"} icon={TrendingUp} />
        <StatCard label="Class position" value={published && myRow ? ordinal(myRow.position) : "—"} icon={Award} accent="warning" />
        <StatCard label="Subjects" value={classSubjects.length} icon={BookOpen} accent="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Latest results</CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">
                {published ? `Published · ${SCHOOL.term}` : STAGE_LABEL[stage]}
              </p>
            </div>
            {published && (
              <Link to="/report-card/$studentId" params={{ studentId: student.id }}>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" /> Report card
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {published && myRow ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                      <th className="py-2 font-medium">Subject</th>
                      <th className="py-2 text-right font-medium">Total</th>
                      <th className="py-2 text-right font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRow.perSubject.map((p) => {
                      const sub = classSubjects.find((s) => s.id === p.subjectId);
                      const g = gradeFor(p.total);
                      return (
                        <tr key={p.subjectId} className="border-b last:border-0">
                          <td className="py-2 font-medium">{sub?.name}</td>
                          <td className="text-primary py-2 text-right font-semibold tabular-nums">{p.total}</td>
                          <td className="py-2 text-right">
                            <Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center text-sm">
                Your results for this term have not been published yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Recent notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-accent text-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground font-medium">
                  {published ? "Results published" : "Results pending"}
                </p>
                <p className="text-muted-foreground text-xs">{STAGE_LABEL[stage]}</p>
              </div>
            </div>
            <Link to="/notifications" className="text-primary block pt-1 text-xs font-medium hover:underline">
              View all notifications →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
