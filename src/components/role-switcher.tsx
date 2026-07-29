import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABEL } from "@/lib/auth-context";
import { LogOut, UserCircle2 } from "lucide-react";

export function RoleSwitcher() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 sm:flex">
        <UserCircle2 className="text-muted-foreground h-5 w-5" />
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-muted-foreground text-[11px]">{ROLE_LABEL[user.role]}</div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
