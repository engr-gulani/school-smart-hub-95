import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Megaphone, KeyRound, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NOTIFICATIONS, STUDENTS, type Notification } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Student portal" }] }),
  component: NotificationsPage,
});

const ICON: Record<Notification["kind"], React.ComponentType<{ className?: string }>> = {
  result: CheckCircle2,
  term: CalendarDays,
  announcement: Megaphone,
  password: KeyRound,
  attendance: Bell,
};

function NotificationsPage() {
  const { user } = useAuth();
  if (user.role !== "student" || !user.studentId) return <Navigate to="/dashboard" />;
  const student = STUDENTS.find((s) => s.id === user.studentId)!;

  const visible = NOTIFICATIONS.filter((n) => {
    if (!n.scope || n.scope === "all") return true;
    if (n.scope === "class") return n.classId === student.classId;
    if (n.scope === "student") return true;
    return false;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">Announcements, result updates and account activity.</p>
      </div>
      <div className="space-y-3">
        {visible.map((n) => {
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
                    <Badge variant="secondary" className="text-[10px] uppercase">{n.kind}</Badge>
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
