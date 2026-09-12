import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  School,
  ClipboardEdit,
  FileCheck2,
  Settings,
  LogOut,
  Sparkles,
  User as UserIcon,
  UserCog,
  FileText,
  Bell,
  Banknote,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, ROLE_LABEL, can } from "@/lib/auth-context";
import { SCHOOL } from "@/lib/mock-data";
import { useAcademics, currentTerm } from "@/lib/use-academics";
import { CalendarDays } from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const { data } = useAcademics();
  const term = currentTerm(data);
  const role = user.role;
  const isStudent = role === "student";

  const main: NavItem[] = isStudent
    ? [
        { title: "My Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
        { title: "My Results", url: "/my-results", icon: FileText, show: true },
        { title: "Notifications", url: "/notifications", icon: Bell, show: true },
        { title: "School Fees", url: "/fees", icon: Banknote, show: true },
        { title: "My Profile", url: "/my-profile", icon: UserIcon, show: true },
      ]
    : [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
        { title: "Students", url: "/students", icon: Users, show: role !== "accountant" },
        { title: "Teachers", url: "/teachers", icon: GraduationCap, show: can(role, "manage_teachers") },
        { title: "Classes", url: "/classes", icon: School, show: can(role, "manage_classes") },
        { title: "Subjects", url: "/subjects", icon: BookOpen, show: role !== "accountant" },
        { title: "School Fees", url: "/fees", icon: Banknote, show: true },
        { title: "Notifications", url: "/notifications", icon: Bell, show: true },
      ];

  const academic: NavItem[] = isStudent
    ? []
    : [
        { title: "Score Entry", url: "/scores", icon: ClipboardEdit, show: can(role, "enter_scores") },
        { title: "Results & Broadsheet", url: "/results", icon: FileCheck2, show: can(role, "view_broadsheet") },
        {
          title: "Promotions",
          url: "/promotions",
          icon: GraduationCap,
          show: can(role, "view_broadsheet"),
        },
      ];


  const admin: NavItem[] = isStudent
    ? []
    : [
        { title: "User Accounts", url: "/users", icon: UserCog, show: can(role, "manage_school") },
        {
          title: "Sessions & Terms",
          url: "/sessions",
          icon: CalendarDays,
          show: can(role, "manage_school") || role === "principal" || role === "vp_academic",
        },
        { title: "School Settings", url: "/settings", icon: Settings, show: can(role, "manage_school") },
      ];


  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = items.filter((i) => i.show);
    if (!visible.length) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="bg-gradient-primary shadow-elegant flex h-9 w-9 items-center justify-center rounded-lg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold text-sidebar-foreground">
              {SCHOOL.name}
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">
              {term.isOpen ? term.label : `${term.session} · between terms`}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Overview", main)}
        {renderGroup("Academics", academic)}
        {renderGroup("Administration", admin)}
      </SidebarContent>
      <SidebarFooter>
        <div className="border-sidebar-border/60 flex items-center gap-2 rounded-md border p-2">
          <div className="bg-sidebar-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-sidebar-accent-foreground">
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/60">{ROLE_LABEL[user.role]}</p>
          </div>
          <button
            onClick={logout}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
