import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SCHOOL } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SCHOOL.name} — School Management Portal` },
      {
        name: "description",
        content: `${SCHOOL.name} portal for automated results, report cards, broadsheets and academic administration.`,
      },
      { property: "og:title", content: `${SCHOOL.name} — School Management Portal` },
      {
        property: "og:description",
        content: "Automated results, report cards and broadsheets for a modern high school.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ClipboardCheck, title: "Auto Result Processing", body: "Teachers enter CA & exam scores; totals, grades, positions and remarks compute instantly." },
  { icon: FileText, title: "Beautiful Report Cards", body: "One-click printable A4 report cards with logo, signature, QR verification and comments." },
  { icon: BarChart3, title: "Broadsheets & Analytics", body: "Class broadsheets, subject performance, grade distribution and top / weakest students." },
  { icon: ShieldCheck, title: "Role-based Access", body: "Admins, principals, class teachers and subject teachers each see only what they should." },
];

function Landing() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <header className="bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-primary shadow-elegant flex h-10 w-10 items-center justify-center rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold leading-tight">{SCHOOL.name}</p>
                <p className="text-xs opacity-70">{SCHOOL.motto}</p>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="secondary" size="sm" className="gap-1">
                Open portal <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
          <div>
            <span className="ring-1 ring-white/20 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              {SCHOOL.session} · {SCHOOL.term}
            </span>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              The modern operating system for your high school.
            </h1>
            <p className="mt-4 max-w-lg text-base opacity-80">
              Automate result processing end-to-end: score entry, grade computation, positions,
              approval workflow, report cards and broadsheets — in one focused portal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90">
                  Enter portal
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}
              >
                Sign in as…
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="ring-1 ring-white/20 rounded-2xl bg-white/10 p-4 backdrop-blur-lg">
              <div className="bg-background text-foreground rounded-xl p-4 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="text-primary h-5 w-5" />
                    <span className="text-sm font-semibold">SS 1A · Mathematics broadsheet</span>
                  </div>
                  <span className="bg-success/15 text-success rounded-full px-2 py-0.5 text-[11px] font-medium">
                    Approved
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                  {["Mary Okafor", "Ahmed Bello", "Grace Musa", "Peter Eze", "Sade Ojo"].map((n, i) => (
                    <div key={n} className="col-span-5 grid grid-cols-5 items-center gap-2 rounded-md px-2 py-2 odd:bg-muted/40">
                      <span className="col-span-2 truncate font-medium">{n}</span>
                      <span className="text-muted-foreground">CA {28 + i}</span>
                      <span className="text-muted-foreground">Exam {58 - i * 2}</span>
                      <span className="text-primary text-right font-semibold">{86 - i * 2}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">Everything academic, automated</p>
          <h2 className="font-display mt-2 text-3xl font-semibold">Built for the way schools actually work</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="shadow-card border-border/60">
              <CardContent className="p-5">
                <div className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-lg">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Sign-in CTA */}
      <section id="roles" className="bg-muted/40 border-y">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">Get started</p>
          <h2 className="font-display mt-2 text-3xl font-semibold">Sign in to your school portal</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">
            Staff and students access dashboards, results, and administration based on their role.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-1">
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Create account</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs md:flex-row">
          <span>© {new Date().getFullYear()} {SCHOOL.name}. All rights reserved.</span>
          <span>{SCHOOL.address} · {SCHOOL.phone}</span>
        </div>
      </footer>
    </div>
  );
}
