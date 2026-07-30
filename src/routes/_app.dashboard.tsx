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
import {
  CLASSES,
  NOTIFICATIONS,
  PUBLISHED_CLASS_IDS,
  SCHOOL,
  STUDENTS,
  SUBJECTS,
  USERS,
  SCORES,
  attendanceFor,
  classBroadsheet,
  gradeFor,
  ordinal,
} from "@/lib/mock-data";

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

  if (user.role === "student") return <StudentDashboard />;

  const teacherCount = USERS.filter((u) => u.role === "subject_teacher" || u.role === "class_teacher").length;
  const isTeacherView = user.role === "subject_teacher" || user.role === "class_teacher";

  const assignedSubjects = SUBJECTS.filter(
    (s) => user.subjectIds?.includes(s.id) || (user.role === "class_teacher" && user.classIds?.includes(s.classId)),
  );
  const assignedClasses = CLASSES.filter((c) => user.classIds?.includes(c.id));
  const studentsInScope = isTeacherView
    ? STUDENTS.filter((st) => assignedSubjects.some((sub) => sub.classId === st.classId))
    : STUDENTS;


  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {SCHOOL.session} · {SCHOOL.term}
          </p>
          <h1 className="font-display text-3xl font-semibold">Welcome back, {user.name.split(" ").slice(-1)[0]}.</h1>
          <p className="text-muted-foreground text-sm">
            {isTeacherView
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
          <StatCard label="Assigned Classes" value={assignedClasses.length || new Set(assignedSubjects.map((s) => s.classId)).size} icon={SchoolIcon} accent="success" />
          <StatCard label="Students in scope" value={studentsInScope.length} icon={Users} accent="muted" />
          <StatCard label="Pending uploads" value={2} hint="Awaiting CA2 for MTH SS1A" icon={ClipboardCheck} accent="warning" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={STUDENTS.length} icon={Users} />
          <StatCard label="Teachers" value={teacherCount} icon={GraduationCap} accent="success" />
          <StatCard label="Classes" value={CLASSES.length} icon={SchoolIcon} accent="muted" />
          <StatCard label="Subjects" value={SUBJECTS.length} icon={BookOpen} accent="warning" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">SS 1A · Live broadsheet snapshot</CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">Auto-computed totals & positions</p>
            </div>
            <Link to="/results" className="text-primary text-xs font-medium hover:underline">
              View full broadsheet →
            </Link>
          </CardHeader>
          <CardContent>
            <SnapshotBroadsheet />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { who: "Mr. John", what: "uploaded MTH SS1A exam scores", when: "2h ago", icon: ClipboardCheck },
              { who: "Mrs. Grace", what: "approved SS1A CA results", when: "5h ago", icon: FileCheck2 },
              { who: "Principal", what: "published SS2A first term results", when: "Yesterday", icon: TrendingUp },
              { who: "Admin", what: "registered 3 new students in JSS1A", when: "2d ago", icon: Users },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="bg-accent text-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">
                    <span className="font-medium">{a.who}</span> {a.what}
                  </p>
                  <p className="text-muted-foreground text-xs">{a.when}</p>
                </div>
              </div>
            ))}
            <p className="text-muted-foreground pt-2 text-[11px]">
              {SCORES.length} score entries recorded this term.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SnapshotBroadsheet() {
  const { subjects, rows } = classBroadsheet("c-ss1a");
  const top = rows.slice(0, 5);
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

function StudentDashboard() {
  const { user } = useAuth();
  const student = STUDENTS.find((s) => s.id === user.studentId);
  if (!student) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No student record linked to this account. Please contact the administrator.
      </div>
    );
  }
  const cls = CLASSES.find((c) => c.id === student.classId)!;
  const attendance = attendanceFor(student.id);
  const published = PUBLISHED_CLASS_IDS.includes(cls.id);
  const { rows } = classBroadsheet(cls.id);
  const myRow = rows.find((r) => r.student.id === student.id);
  const classSubjects = SUBJECTS.filter((s) => s.classId === cls.id);
  const recentNotifications = NOTIFICATIONS.filter(
    (n) => !n.scope || n.scope === "all" || (n.scope === "class" && n.classId === cls.id) || n.scope === "student",
  ).slice(0, 4);
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
            <p className="text-muted-foreground text-sm">{cls.name} · {student.gender}</p>
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
                {published ? "Published · First Term" : "Awaiting publication by the Principal"}
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
            {recentNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3">
                <div className="bg-accent text-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium">{n.title}</p>
                  <p className="text-muted-foreground truncate text-xs">{n.body}</p>
                  <p className="text-muted-foreground text-[11px]">{n.when}</p>
                </div>
              </div>
            ))}
            <Link to="/notifications" className="text-primary block pt-1 text-xs font-medium hover:underline">
              View all notifications →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

