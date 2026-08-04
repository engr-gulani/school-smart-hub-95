import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Lock, Megaphone, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, can } from "@/lib/auth-context";
import { useAcademics, useRefreshAcademics, currentTerm } from "@/lib/use-academics";
import {
  setTermStatus,
  broadcastAnnouncement,
  setNextTermBegins,
} from "@/lib/academics.functions";

export const Route = createFileRoute("/_app/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions & Terms · Greenfield College Portal" },
      {
        name: "description",
        content:
          "Open or close academic terms, set the resumption date and broadcast notifications to everyone in the school.",
      },
      { property: "og:title", content: "Sessions & Terms · Greenfield College Portal" },
      {
        property: "og:description",
        content: "Manage the academic calendar and send school-wide notifications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionsPage,
});

const STATUS_STYLE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "In session", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
};

function SessionsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();

  const changeStatus = useServerFn(setTermStatus);
  const broadcast = useServerFn(broadcastAnnouncement);
  const saveResumption = useServerFn(setNextTermBegins);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "staff" | "students">("all");
  const [resumption, setResumption] = useState("");

  const allowed =
    can(user.role, "manage_school") || user.role === "principal" || user.role === "vp_academic";

  const statusMut = useMutation({
    mutationFn: (v: { termId: string; status: "open" | "closed" | "upcoming" }) =>
      changeStatus({ data: v }),
    onSuccess: (res: { openedName?: string | null }) => {
      refresh();
      toast.success(
        res?.openedName ? `${res.openedName} is now in session` : "Term status updated",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const broadcastMut = useMutation({
    mutationFn: () => broadcast({ data: { title, body, audience } }),
    onSuccess: () => {
      refresh();
      setTitle("");
      setBody("");
      toast.success("Notification sent to all recipients");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resumptionMut = useMutation({
    mutationFn: () => saveResumption({ data: { nextTermBegins: resumption || null } }),
    onSuccess: () => {
      refresh();
      toast.success("Resumption date saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!allowed) return <Navigate to="/dashboard" />;

  const terms = data?.terms ?? [];
  const term = currentTerm(data);
  const sessions = [...new Set(terms.map((t) => t.session))].sort();
  const announcements = data?.announcements ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold">Sessions &amp; Terms</h1>
          <p className="text-muted-foreground text-sm">
            Open or close terms, set resumption and notify everyone in the school.
          </p>
        </div>
        <Badge variant={term.isOpen ? "default" : "secondary"} className="w-fit">
          {term.isOpen ? `In session: ${term.label}` : "No term is currently in session"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-16 text-center text-sm">Loading academic calendar…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {sessions.map((session) => (
              <Card key={session} className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4" /> {session} session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {terms
                    .filter((t) => t.session === session)
                    .map((t) => {
                      const style = STATUS_STYLE[t.status] ?? STATUS_STYLE.upcoming!;
                      const busy = statusMut.isPending && statusMut.variables?.termId === t.id;
                      return (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{t.name}</p>
                              <Badge variant={style.variant} className="text-[10px] uppercase">
                                {style.label}
                              </Badge>
                              {t.id === term.id && term.isOpen && (
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {t.startsOn ?? "—"} → {t.endsOn ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {busy && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
                            {t.status !== "open" && (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                disabled={statusMut.isPending}
                                onClick={() => statusMut.mutate({ termId: t.id, status: "open" })}
                              >
                                <Play className="h-3.5 w-3.5" /> Open term
                              </Button>
                            )}
                            {t.status !== "closed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                disabled={statusMut.isPending}
                                onClick={() => statusMut.mutate({ termId: t.id, status: "closed" })}
                              >
                                <Lock className="h-3.5 w-3.5" /> Close term
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  <p className="text-muted-foreground text-xs">
                    Closing a term locks score entry for it and automatically opens the next term of the
                    session for every user.
                  </p>
                </CardContent>
              </Card>
            ))}

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Resumption date</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="resumption">Next term begins</Label>
                  <Input
                    id="resumption"
                    type="date"
                    value={resumption || data?.settings.nextTermBegins || ""}
                    onChange={(e) => setResumption(e.target.value)}
                    className="w-52"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={resumptionMut.isPending}
                  onClick={() => resumptionMut.mutate()}
                >
                  Save date
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4" /> Broadcast a notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="n-title">Title</Label>
                  <Input
                    id="n-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mid-term break"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="n-body">Message</Label>
                  <Textarea
                    id="n-body"
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="School closes on Friday for the mid-term break…"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="n-audience">Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                    <SelectTrigger id="n-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="staff">Staff only</SelectItem>
                      <SelectItem value="students">Students only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={broadcastMut.isPending || title.trim().length < 3 || body.trim().length < 3}
                  onClick={() => broadcastMut.mutate()}
                >
                  {broadcastMut.isPending ? "Sending…" : "Send notification"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Recent broadcasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcements.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nothing has been sent yet.</p>
                )}
                {announcements.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {a.audience}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{a.body}</p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
