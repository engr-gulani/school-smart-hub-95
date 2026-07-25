import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "primary" | "warning" | "success" | "muted";
}) {
  const accentBg = {
    primary: "bg-gradient-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
    muted: "bg-muted text-muted-foreground",
  }[accent];

  return (
    <Card className="shadow-card overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
          <p className="font-display text-foreground mt-1 text-2xl font-semibold">{value}</p>
          {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </div>
        <div className={`${accentBg} flex h-11 w-11 items-center justify-center rounded-xl`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
