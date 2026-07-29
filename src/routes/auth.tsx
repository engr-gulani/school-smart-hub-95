import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SCHOOL } from "@/lib/mock-data";
import { ROLE_LABEL } from "@/lib/auth-context";
import type { Role } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Sign in — ${SCHOOL.name}` },
      { name: "description", content: `Sign in or create an account for the ${SCHOOL.name} portal.` },
      { property: "og:title", content: `Sign in — ${SCHOOL.name}` },
      { property: "og:description", content: "Access the school management portal." },
    ],
  }),
  component: AuthPage,
});

const SIGNUP_ROLES: Role[] = [
  "student",
  "subject_teacher",
  "class_teacher",
  "vp_academic",
  "principal",
  "school_admin",
];

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce to dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  // Sign in state
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");

  // Sign up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  const [suRole, setSuRole] = useState<Role>("student");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (suPwd.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: suName, role: suRole },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="bg-gradient-hero min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Link to="/" className="mb-6 flex items-center gap-2 text-white">
          <div className="bg-gradient-primary shadow-elegant flex h-10 w-10 items-center justify-center rounded-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-tight">{SCHOOL.name}</p>
            <p className="text-xs opacity-70">{SCHOOL.motto}</p>
          </div>
        </Link>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display">Welcome</CardTitle>
            <CardDescription>Sign in to your portal account or create a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-pwd">Password</Label>
                    <Input id="si-pwd" type="password" required value={siPwd} onChange={(e) => setSiPwd(e.target.value)} />
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" required value={suName} onChange={(e) => setSuName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pwd">Password</Label>
                    <Input id="su-pwd" type="password" required minLength={8} value={suPwd} onChange={(e) => setSuPwd(e.target.value)} />
                    <p className="text-muted-foreground text-[11px]">Minimum 8 characters.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-role">I am a</Label>
                    <Select value={suRole} onValueChange={(v) => setSuRole(v as Role)}>
                      <SelectTrigger id="su-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SIGNUP_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/70">
          <Link to="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
