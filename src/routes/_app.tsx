import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { RoleSwitcher } from "@/components/role-switcher";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="bg-background flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="bg-card/70 border-border sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  School Portal
                </span>
              </div>
              <RoleSwitcher />
            </header>
            <main className="min-w-0 flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
