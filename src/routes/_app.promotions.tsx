import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { compileSessionPromotions } from "@/lib/academics.functions";
import {
  PROMOTION_LABEL,
  sessionCompilation,
  sessionTerms,
  useAcademics,
  useRefreshAcademics,
  type PromotionDecision,
} from "@/lib/use-academics";

export const Route = createFileRoute("/_app/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & session results · Greenfield College Portal" },
      {
        name: "description",
        content:
          "Compile first, second and third term averages into a final session result and record promotion or demotion for every student.",
      },
      { property: "og:title", content: "Promotions & session results" },
      {
        property: "og:description",
        content: "Automatic end-of-session compilation with promotion, probation and demotion decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PromotionsPage,
});

const badgeClass: Record<PromotionDecision, string> = {
  promoted: "bg-success/15 text-success border-success/30",
  probation: "bg-warning/15 text-warning border-warning/30",
  demoted: "bg-destructive/10 text-destructive border-destructive/30",
};

function PromotionsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const compile = useServerFn(compileSessionPromotions);
  const [busy, setBusy] = useState(false);

  const sessions = useMemo(
    () => Array.from(new Set((data?.terms ?? []).map((t) => t.session))).sort(),
    [data],
  );
  const [session, setSession] = useState("");
  useEffect(() => {
    if (!session && sessions.length) setSession(sessions[sessions.length - 1]);
  }, [sessions, session]);

  const [classId, setClassId] = useState("all");

  const terms = sessionTerms(data, session);
  const allClosed = terms.length > 0 && terms.every((t) => t.status === "closed");
  const preview = useMemo(
    () => sessionCompilation(data, session, classId === "all" ? undefined : classId),
    [data, session, classId],
  );
  const saved = (data?.promotions ?? []).filter((p) => p.session === session);

  const leadership = ["school_admin", "super_admin", "principal", "vp_academic"].includes(user.role);

  const run = async (apply: boolean) => {
    setBusy(true);
    try {
      const res = await compile({ data: { session, apply } });
      toast.success(
        apply
          ? `Compiled ${res.compiled} students and moved ${res.moved} to their new class`
          : `Compiled ${res.compiled} student results for ${session}`,
      );
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not compile the session result");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading session results…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Promotions & session result</h1>
          <p className="text-muted-foreground text-sm">
            First + second + third term averages combine into a final average. Promoted at 40 and above, promoted
            on probation from 37, demoted below 37.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={session} onValueChange={setSession}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {(data?.classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {leadership && (
            <>
              <Button size="sm" className="gap-2" disabled={busy || !allClosed} onClick={() => run(false)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Compile session result
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !allClosed}
                onClick={() => run(true)}
              >
                Compile & move classes
              </Button>
            </>
          )}
        </div>
      </div>

      {!allClosed && (
        <p className="text-muted-foreground flex items-center gap-2 rounded-md border p-3 text-xs">
          <Lock className="h-3.5 w-3.5" /> Compilation unlocks once every term of {session || "the session"} is
          closed
          {terms.length
            ? ` — still open: ${terms.filter((t) => t.status !== "closed").map((t) => t.name).join(", ") || "none"}`
            : ""}
          .
        </p>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            {session} · {saved.length ? "Recorded decisions" : "Projected decisions"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Class</th>
                {terms.map((t) => (
                  <th key={t.id} className="py-2 pr-3 text-right font-medium">
                    {t.name}
                  </th>
                ))}
                <th className="py-2 pr-3 text-right font-medium">Final avg</th>
                <th className="py-2 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => {
                const rec = saved.find((p) => p.studentId === row.student.id);
                const decision = (rec?.decision as PromotionDecision) ?? row.decision;
                const average = rec ? rec.average : row.average;
                const cls = data?.classes.find((c) => c.id === row.student.classId);
                return (
                  <tr key={row.student.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{row.student.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{row.student.admissionNo}</p>
                    </td>
                    <td className="text-muted-foreground py-2 pr-3">{cls?.name}</td>
                    {row.perTerm.map((t) => (
                      <td key={t.termId} className="py-2 pr-3 text-right tabular-nums">
                        {t.hasScores ? t.average.toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="text-primary py-2 pr-3 text-right font-semibold tabular-nums">
                      {average.toFixed(1)}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant="outline" className={badgeClass[decision]}>
                        {PROMOTION_LABEL[decision]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!preview.length && (
                <tr>
                  <td colSpan={4 + terms.length} className="text-muted-foreground py-8 text-center text-sm">
                    No students to compile for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
