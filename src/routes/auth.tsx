import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { SCHOOL } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Sign in — ${SCHOOL.name}` },
      { name: "description", content: `Sign in to the ${SCHOOL.name} portal.` },
      { property: "og:title", content: `Sign in — ${SCHOOL.name}` },
      { property: "og:description", content: "Access the school management portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
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
            <CardTitle className="font-display">Sign in</CardTitle>
            <CardDescription>
              Access is by invitation only. Contact your school administrator if you need an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-pwd">Password</Label>
                <Input id="si-pwd" type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/70">
          <Link to="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
