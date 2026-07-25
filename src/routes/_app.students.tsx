import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, FileText } from "lucide-react";
import { CLASSES, STUDENTS } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/students")({
  head: () => ({ meta: [{ title: "Students · Greenfield College Portal" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const filtered = useMemo(
    () =>
      STUDENTS.filter((s) => {
        const matchQ = q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.admissionNo.toLowerCase().includes(q.toLowerCase());
        const matchClass = classId === "all" || s.classId === classId;
        return matchQ && matchClass;
      }),
    [q, classId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Students</h1>
          <p className="text-muted-foreground text-sm">Manage records for {STUDENTS.length} enrolled students.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Register student
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">All students</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or admission no." className="w-64 pl-8" />
            </div>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                const cls = CLASSES.find((c) => c.id === s.classId)!;
                return (
                  <tr key={s.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{s.admissionNo}</td>
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{cls.name}</Badge>
                    </td>
                    <td className="py-2 pr-4">{s.gender}</td>
                    <td className="py-2 pr-4">{s.parentName}</td>
                    <td className="text-muted-foreground py-2 pr-4">{s.parentPhone}</td>
                    <td className="py-2 text-right">
                      <Link to="/report-card/$studentId" params={{ studentId: s.id }}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <FileText className="h-3.5 w-3.5" /> Report
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
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
    </div>
  );
}
