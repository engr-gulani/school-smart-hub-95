import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, ROLE_LABEL } from "@/lib/auth-context";
import { USERS } from "@/lib/mock-data";
import { Users2 } from "lucide-react";

export function RoleSwitcher() {
  const { user, setUserById } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <Users2 className="text-muted-foreground h-4 w-4" />
      <Select value={user.id} onValueChange={setUserById}>
        <SelectTrigger className="h-9 w-[240px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USERS.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="text-muted-foreground text-xs">{ROLE_LABEL[u.role]} ·</span>{" "}
              <span className="font-medium">{u.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
