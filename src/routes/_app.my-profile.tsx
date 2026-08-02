import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAcademics, useRefreshAcademics } from "@/lib/use-academics";
import { updateMyContact } from "@/lib/academics.functions";
import { SCHOOL, attendanceFor } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/my-profile")({
  head: () => ({
    meta: [
      { title: "My profile · Student portal" },
      { name: "description", content: "Your personal details, guardian contact and password settings." },
    ],
  }),
  component: MyProfile,
});

function MyProfile() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();

  const student = data?.students.find((s) => s.id === data?.me.studentId);
  const cls = data?.classes.find((c) => c.id === student?.classId);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pw, setPw] = useState({ next: "", confirm: "" });

  useEffect(() => {
    if (student) {
      setPhone(student.parentPhone ?? "");
      setAddress(student.address ?? "");
    }
  }, [student?.id, student?.parentPhone, student?.address]);

  const saveContact = useMutation({
    mutationFn: () => updateMyContact({ data: { parentPhone: phone, address } }),
    onSuccess: () => {
      toast.success("Contact details updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    if (error) return toast.error(error.message);
    setPw({ next: "", confirm: "" });
    toast.success("Password changed successfully");
  };

  if (isLoading) return <p className="text-muted-foreground py-16 text-center text-sm">Loading your profile…</p>;

  if (!student) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">No student record linked</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your account isn't linked to a student record yet. Please contact the school administrator.
        </p>
      </div>
    );
  }

  const attendance = attendanceFor(student.id);
  const initials = student.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

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
            <p className="text-muted-foreground text-sm">
              {cls?.name ?? student.classId} · {SCHOOL.session} · {SCHOOL.term}
            </p>
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
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Gender" value={student.gender} />
            <Field label="Date of birth" value={student.dob || "—"} />
            <Field label="Parent / Guardian" value={student.parentName || "—"} />
            <Field label="Email" value={user.email} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Update contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveContact.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="phone">Guardian phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Home address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Button type="submit" size="sm" disabled={saveContact.isPending}>
                {saveContact.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            For security reasons, students cannot change their own password. Please contact the school
            administrator to have your password reset.
          </p>
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
