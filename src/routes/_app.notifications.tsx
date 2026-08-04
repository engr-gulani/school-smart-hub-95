import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Megaphone, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAcademics, stageFor, STAGE_LABEL, currentTerm } from "@/lib/use-academics";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Greenfield College Portal" },
      {
        name: "description",
        content: "Term updates, school broadcasts and result activity for staff and students.",
      },
      { property: "og:title", content: "Notifications · Greenfield College Portal" },
      { property: "og:description", content: "Term updates, school broadcasts and result activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

type Kind = "result" | "term" | "announcement";

const ICON: Record<Kind, React.ComponentType<{ className?: string }>> = {
  result: CheckCircle2,
  term: CalendarDays,
  announcement: Megaphone,
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
  const isStudent = user.role === "student";
  const term = currentTerm(data);

  if (isLoading) {
    return <div className="text-muted-foreground py-16 text-center text-sm">Loading notifications…</div>;
  }

  const student = isStudent
    ? (data?.students ?? []).find((s) => s.id === user.studentId || s.userId === user.id)
    : undefined;

  const items: { id: string; title: string; body: string; when: string; kind: Kind }[] = [];

  for (const a of data?.announcements ?? []) {
    if (a.audience === "students" && !isStudent) continue;
    if (a.audience === "staff" && isStudent) continue;
    items.push({
      id: a.id,
      title: a.title,
      body: a.body,
      when: timeAgo(a.createdAt) || new Date(a.createdAt).toLocaleDateString(),
      kind: (a.kind === "term" ? "term" : "announcement") as Kind,
    });
  }

  items.push({
    id: "term-status",
    title: term.isOpen ? `${term.label} is in session` : "No term is currently in session",
    body: term.isOpen
      ? term.nextTermBegins
        ? `Next term begins ${term.nextTermBegins}.`
        : "Score entry and result processing are open for this term."
      : "The academic calendar is between terms. Score entry is locked.",
    when: "Now",
    kind: "term",
  });

  if (isStudent && student) {
    const approval = (data?.approvals ?? []).find(
      (a) => a.classId === student.classId && (!term.id || a.termId === term.id),
    );
    const stage = stageFor(data, student.classId);
    const published = stage === "published";
    const cls = (data?.classes ?? []).find((c) => c.id === student.classId);
    items.push({
      id: "result",
      title: published ? `${term.name} results published` : `${term.name} results in progress`,
      body: published
        ? "Your results are now available. Open My Results to view or download your report card."
        : STAGE_LABEL[stage],
      when: timeAgo(approval?.publishedAt ?? approval?.submittedAt) || "This term",
      kind: "result",
    });
    items.push({
      id: "class",
      title: `You are enrolled in ${cls?.name ?? student.classId}`,
      body: cls?.classTeacherName
        ? `Your class teacher is ${cls.classTeacherName}.`
        : "A class teacher has not been assigned to your class yet.",
      when: "This term",
      kind: "announcement",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Announcements, term updates and result activity.
        </p>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="text-muted-foreground p-6 text-center text-sm">
              <Bell className="mx-auto mb-2 h-5 w-5" />
              Nothing new right now.
            </CardContent>
          </Card>
        )}
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
