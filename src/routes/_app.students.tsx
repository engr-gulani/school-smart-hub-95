import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, UserPlus, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAcademics, useRefreshAcademics, type ApiStudent } from "@/lib/use-academics";
import { upsertStudent } from "@/lib/academics.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/students")({
  head: () => ({
    meta: [
      { title: "Students · Greenfield College Portal" },
      { name: "description", content: "Enrolled student records, classes and guardian contacts." },
    ],
  }),
  component: StudentsPage,
});

interface FormState {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: "Male" | "Female";
  dob: string;
  classId: string;
  parentName: string;
  parentPhone: string;
  address: string;
}

const emptyForm = (classId: string): FormState => ({
  id: "",
  admissionNo: "",
  fullName: "",
  gender: "Male",
  dob: "",
  classId,
  parentName: "",
  parentPhone: "",
  address: "",
});

function StudentsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAcademics();
  const refresh = useRefreshAcademics();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(""));

  const classes = data?.classes ?? [];
  const students = data?.students ?? [];

  const canManage =
    user.role === "school_admin" ||
    user.role === "super_admin" ||
    classes.some((c) => c.classTeacherId === user.id);

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const term = q.toLowerCase();
        const matchQ =
          term === "" || s.name.toLowerCase().includes(term) || s.admissionNo.toLowerCase().includes(term);
        return matchQ && (classId === "all" || s.classId === classId);
      }),
    [students, q, classId],
  );

  const save = useMutation({
    mutationFn: (f: FormState) =>
      upsertStudent({
        data: {
          id: f.id || undefined,
          admissionNo: f.admissionNo,
          fullName: f.fullName,
          gender: f.gender,
          dob: f.dob,
          classId: f.classId,
          parentName: f.parentName,
          parentPhone: f.parentPhone,
          address: f.address,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Student record updated" : "Student registered");
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startCreate = () => {
    setForm(emptyForm(classes[0]?.id ?? ""));
    setOpen(true);
  };
  const startEdit = (s: ApiStudent) => {
    setForm({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.name,
      gender: s.gender === "Female" ? "Female" : "Male",
      dob: s.dob ?? "",
      classId: s.classId,
      parentName: s.parentName ?? "",
      parentPhone: s.parentPhone ?? "",
      address: s.address ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Students</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading records…" : `Manage records for ${students.length} enrolled students.`}
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={startCreate}>
            <UserPlus className="h-4 w-4" /> Register student
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">All students</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name or admission no."
                className="w-64 pl-8"
              />
            </div>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">Admission #</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Class</th>
                <th className="py-2 pr-4 font-medium">Gender</th>
                <th className="py-2 pr-4 font-medium">Parent</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const cls = classes.find((c) => c.id === s.classId);
                return (
                  <tr key={s.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{s.admissionNo}</td>
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{cls?.name ?? s.classId}</Badge>
                    </td>
                    <td className="py-2 pr-4">{s.gender}</td>
                    <td className="py-2 pr-4">{s.parentName || "—"}</td>
                    <td className="text-muted-foreground py-2 pr-4">{s.parentPhone || "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => startEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                        <Link to="/report-card/$studentId" params={{ studentId: s.id }}>
                          <Button size="sm" variant="ghost" className="gap-1">
                            <FileText className="h-3.5 w-3.5" /> Report
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                    No students match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit student" : "Register student"}</DialogTitle>
            <DialogDescription>
              Student records are stored in the school database and drive score entry and report cards.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="admissionNo">Admission number</Label>
              <Input
                id="admissionNo"
                value={form.admissionNo}
                onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                required
                disabled={!!form.id}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="parentName">Parent / Guardian</Label>
              <Input
                id="parentName"
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="parentPhone">Parent phone</Label>
              <Input
                id="parentPhone"
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending || !form.classId}>
                {save.isPending ? "Saving…" : form.id ? "Save changes" : "Register student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
