import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAcademics, currentTerm } from "@/lib/use-academics";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Register · Ammu Learning Academy" },
      { name: "description", content: "Daily class attendance register for every class." },
      { property: "og:title", content: "Attendance Register · Ammu Learning Academy" },
      { property: "og:description", content: "Daily class attendance register for every class." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

type Status = "present" | "absent" | "late" | "excused";
const STATUSES: { value: Status; label: string; short: string }[] = [
  { value: "present", label: "Present", short: "P" },
  { value: "absent", label: "Absent", short: "A" },
  { value: "late", label: "Late", short: "L" },
  { value: "excused", label: "Excused", short: "E" },
];
const today = () => new Date().toISOString().slice(0, 10);

function AttendancePage() {
  const { user } = useAuth();
  const role = user.role;
  if (role === "student") return <StudentAttendance />;
  return <ClassRegister role={role} userId={user.id} />;
}

function ClassRegister({ role, userId }: { role: string; userId: string }) {
  const { data } = useAcademics();
  const qc = useQueryClient();
  const leader = ["school_admin", "super_admin", "principal", "vp_academic"].includes(role);
  const classes = useMemo(() => {
    const all = data?.classes ?? [];
    if (leader) return all;
    const mine = new Set((data?.subjects ?? []).filter((s) => s.teacherId === userId).map((s) => s.classId));
    return all.filter((c) => c.classTeacherId === userId || mine.has(c.id));
  }, [data, leader, userId]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);
  const cls = classes.find((c) => c.id === classId);
  const canMark = leader || cls?.classTeacherId === userId;
  const students = (data?.students ?? []).filter((s) => s.classId === classId);
  const term = currentTerm(data);

  const key = ["attendance", classId, date];
  const { data: rows = [] } = useQuery({
    queryKey: key,
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id,status")
        .eq("class_id", classId)
        .eq("date", date);
      if (error) throw error;
      return data;
    },
  });
  const [marks, setMarks] = useState<Record<string, Status>>({});
  useEffect(() => {
    setMarks(Object.fromEntries(rows.map((r) => [r.student_id, r.status as Status])));
  }, [rows]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = students.map((s) => ({
      student_id: s.id,
      class_id: classId,
      term_id: term?.id ?? null,
      date,
      status: marks[s.id] ?? "present",
      marked_by: userId,
    }));
    const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Register saved");
    qc.invalidateQueries({ queryKey: key });
  };

  const counts = STATUSES.map((st) => ({
    ...st,
    n: students.filter((s) => (marks[s.id] ?? (rows.length ? undefined : "present")) === st.value).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Register</h1>
        <p className="text-muted-foreground text-sm">Mark daily attendance for each class.</p>
      </div>
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <div className="flex flex-wrap gap-2 items-center">
            {counts.map((c) => <Badge key={c.value} variant="secondary">{c.label}: {c.n}</Badge>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{cls?.name ?? "No class"} · {students.length} students</CardTitle>
          {canMark && students.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present"])))}>All present</Button>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save register"}</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {!canMark && cls && <p className="text-sm text-muted-foreground">View only — the class teacher marks this register.</p>}
          {students.length === 0 && <p className="text-sm text-muted-foreground">No students in this class.</p>}
          {students.map((s, i) => {
            const cur = marks[s.id] ?? (canMark ? "present" : undefined);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2">
                <div>
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  <span className="font-medium">{s.fullName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.admissionNo}</span>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map((st) => (
                    <Button
                      key={st.value}
                      size="sm"
                      variant={cur === st.value ? "default" : "outline"}
                      disabled={!canMark}
                      onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                      title={st.label}
                    >
                      {st.short}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentAttendance() {
  const { data: rows = [] } = useQuery({
    queryKey: ["attendance", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("date,status").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Attendance</h1>
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-2">
          <Badge>Days recorded: {rows.length}</Badge>
          <Badge variant="secondary">Attended: {present}</Badge>
          <Badge variant="secondary">Rate: {rows.length ? Math.round((present / rows.length) * 100) : 0}%</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-1">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>}
          {rows.map((r) => (
            <div key={r.date} className="flex justify-between border-b border-border py-2 text-sm">
              <span>{new Date(r.date).toLocaleDateString()}</span>
              <span className="capitalize">{r.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
