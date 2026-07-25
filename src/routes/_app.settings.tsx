import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SCHOOL, GRADE_BANDS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "School settings · Greenfield College Portal" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">School settings</h1>
        <p className="text-muted-foreground text-sm">School identity, session and grading policy.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">School identity</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field id="name" label="School name" value={SCHOOL.name} />
            <Field id="motto" label="Motto" value={SCHOOL.motto} />
            <Field id="phone" label="Phone" value={SCHOOL.phone} />
            <Field id="email" label="Email" value={SCHOOL.email} />
            <Field id="website" label="Website" value={SCHOOL.website} />
            <Field id="address" label="Address" value={SCHOOL.address} />
            <div className="md:col-span-2 flex justify-end">
              <Button size="sm">Save changes</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Session & term</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field id="session" label="Current session" value={SCHOOL.session} />
            <Field id="term" label="Current term" value={SCHOOL.term} />
            <Field id="next" label="Next term begins" value={SCHOOL.nextTermBegins} />
            <div className="md:col-span-2 flex justify-end">
              <Button size="sm" variant="secondary">Roll over term</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Grade policy</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <th className="py-2 font-medium">Range</th>
                  <th className="py-2 font-medium">Grade</th>
                  <th className="py-2 font-medium">Remark</th>
                </tr>
              </thead>
              <tbody>
                {GRADE_BANDS.map((g) => (
                  <tr key={g.grade} className="border-b last:border-0">
                    <td className="py-2 tabular-nums">{g.min} – {g.max}</td>
                    <td className="py-2"><Badge variant={g.grade === "F" ? "destructive" : "secondary"}>{g.grade}</Badge></td>
                    <td className="py-2">{g.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={value} />
    </div>
  );
}
