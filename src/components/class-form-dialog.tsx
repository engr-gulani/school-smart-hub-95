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
import { upsertClass } from "@/lib/academics.functions";

const LEVELS = ["Nursery", "Primary", "Junior Secondary", "Senior Secondary"] as const;

interface Props {
  trigger: React.ReactNode;
  initial?: { id: string; name: string; level: string };
  onSaved: () => void | Promise<unknown>;
}

export function ClassFormDialog({ trigger, initial, onSaved }: Props) {
  const save = useServerFn(upsertClass);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState<string>(initial?.level ?? "Junior Secondary");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setLevel(initial?.level ?? "Junior Secondary");
    }
  }, [open, initial?.name, initial?.level]);

  const submit = async () => {
    setBusy(true);
    try {
      await save({ data: { id: initial?.id ?? "", name, level: level as (typeof LEVELS)[number] } });
      toast.success(initial ? "Class updated" : "Class created");
      setOpen(false);
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save class");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit class" : "Add class"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Class name</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. JSS 1A"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || name.trim().length < 2}>
            {busy ? "Saving…" : "Save class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
