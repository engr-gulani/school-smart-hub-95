import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Megaphone, KeyRound, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SCHOOL } from "@/lib/mock-data";
import { useAcademics, stageFor, STAGE_LABEL } from "@/lib/use-academics";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Greenfield College Portal" },
      { name: "description", content: "Result updates, announcements and account activity for students." },
    ],
  }),
  component: NotificationsPage,
});

type Kind = "result" | "term" | "announcement" | "password" | "attendance";

const ICON: Record<Kind, React.ComponentType<{ className?: string }>> = {
  result: CheckCircle2,
  term: CalendarDays,
  announcement: Megaphone,
  password: KeyRound,
  attendance: Bell,
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

function NotificationsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();

  if (user.role !== "student") return <Navigate to="/dashboard" />;

  const student = (data?.students ?? []).find((s) => s.id === user.studentId || s.userId === user.id);

  if (isLoading) {
    return <div className="text-muted-foreground py-16 text-center text-sm">Loading notifications…</div>;
  }
  if (!student) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        No student record linked to this account. Please contact the administrator.
      </div>
    );
  }

  const cls = (data?.classes ?? []).find((c) => c.id === student.classId);
  const approval = (data?.approvals ?? []).find((a) => a.classId === student.classId) as
    | { publishedAt?: string | null; submittedAt?: string | null }
    | undefined;
  const stage = stageFor(data, student.classId);
  const published = stage === "published";

  const items: { id: string; title: string; body: string; when: string; kind: Kind }[] = [
    {
      id: "result",
      title: published ? `${SCHOOL.term} results published` : `${SCHOOL.term} results in progress`,
      body: published
        ? "Your results are now available. Open My Results to view or download your report card."
        : STAGE_LABEL[stage],
      when: timeAgo(approval?.publishedAt ?? approval?.submittedAt) || "This term",
      kind: "result",
    },
    {
      id: "class",
      title: `You are enrolled in ${cls?.name ?? student.classId}`,
      body: cls?.classTeacherName
        ? `Your class teacher is ${cls.classTeacherName}.`
        : "A class teacher has not been assigned to your class yet.",
      when: "This term",
      kind: "announcement",
    },
    {
      id: "term",
      title: "Next term",
      body: `Second Term begins ${SCHOOL.nextTermBegins}. Please settle school fees before resumption.`,
      when: "Upcoming",
      kind: "term",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">Announcements, result updates and account activity.</p>
      </div>
      <div className="space-y-3">
        {items.map((n) => {
          const Icon = ICON[n.kind];
          return (
            <Card key={n.id} className="shadow-card">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="bg-accent text-accent-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {n.kind}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{n.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{n.when}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
