import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { CLASSES, SCHOOL, STUDENTS, attendanceFor } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/my-profile")({
  head: () => ({ meta: [{ title: "My profile · Student portal" }] }),
  component: MyProfile,
});

function MyProfile() {
  const { user } = useAuth();
  if (user.role !== "student" || !user.studentId) return <Navigate to="/dashboard" />;
  const student = STUDENTS.find((s) => s.id === user.studentId)!;
  const cls = CLASSES.find((c) => c.id === student.classId)!;
  const attendance = attendanceFor(student.id);

  const [phone, setPhone] = useState(student.parentPhone);
  const [email, setEmail] = useState(user.email);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const savePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Contact details updated");
  };

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("New password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Password changed successfully");
  };

  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">My profile</h1>
        <p className="text-muted-foreground text-sm">Personal details, contact information and password.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <div className="bg-gradient-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <p className="font-display text-xl font-semibold">{student.name}</p>
            <p className="text-muted-foreground text-sm">{cls.name} · {SCHOOL.session} · {SCHOOL.term}</p>
            <p className="text-muted-foreground font-mono text-xs">{student.admissionNo}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Present" value={attendance.present} />
            <Stat label="Absent" value={attendance.absent} />
            <Stat label="Days" value={attendance.total} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Gender" value={student.gender} />
            <Field label="Date of birth" value={student.dob} />
            <Field label="Parent / Guardian" value={student.parentName} />
            <Field label="Address" value={student.address} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Update contact</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={savePersonal} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" size="sm">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="next">New password</Label>
              <Input id="next" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" size="sm">Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</p>
    </div>
  );
}
