import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertSubject } from "@/lib/academics.functions";

interface Props {
  trigger: React.ReactNode;
  classes: { id: string; name: string }[];
  initial?: { id: string; name: string; code: string; classId: string };
  defaultClassId?: string;
  onSaved: () => void | Promise<unknown>;
}

export function SubjectFormDialog({ trigger, classes, initial, defaultClassId, onSaved }: Props) {
  const save = useServerFn(upsertSubject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [classId, setClassId] = useState(initial?.classId ?? defaultClassId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setClassId(initial?.classId ?? defaultClassId ?? "");
    }
  }, [open, initial?.name, initial?.code, initial?.classId, defaultClassId]);

  const submit = async () => {
    setBusy(true);
    try {
      await save({ data: { id: initial?.id ?? "", name, code, classId } });
      toast.success(initial ? "Subject updated" : "Subject created");
      setOpen(false);
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save subject");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit subject" : "Add subject"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">Subject name</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject-code">Subject code</Label>
            <Input
              id="subject-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MTH101"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
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
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={busy || name.trim().length < 2 || code.trim().length < 2 || !classId}
          >
            {busy ? "Saving…" : "Save subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
