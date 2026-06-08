import Link from "next/link";
import {
  Shield,
  Zap,
  FileText,
  BarChart3,
  Lock,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { prisma } from "@/lib/prisma";

async function fetchStats() {
  try {
    const [resolvedDisputes, totalClients, totalRevenueAgg] = await Promise.all([
      prisma.disputeItem.count({ where: { status: "RESOLVED" } }),
      prisma.client.count(),
      prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    ]);
    return {
      resolvedDisputes,
      totalClients,
      totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
    };
  } catch {
    return null;
  }
}

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Analysis",
    description:
      "Our AI engine automatically scans credit reports, identifies inaccurate items, and calculates dispute confidence scores.",
  },
  {
    icon: FileText,
    title: "FCRA Dispute Letters",
    description:
      "Generate legally compliant Fair Credit Reporting Act dispute letters tailored to each bureau and creditor automatically.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Progress Tracker",
    description:
      "Track every dispute from submission to resolution with visual progress bars, status updates, and timeline views.",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description:
      "SSN and sensitive data are encrypted at rest. All communications use TLS. We never share your information.",
  },
  {
    icon: CreditCard,
    title: "Stripe Billing",
    description:
      "Secure subscription management with automated invoicing, payment processing, and customer billing portals.",
  },
  {
    icon: Users,
    title: "Admin Dashboard",
    description:
      "Manage clients, monitor disputes, review AI-generated letters, and track revenue from a single powerful dashboard.",
  },
];

const packages = [
  {
    name: "Basic",
    price: "$149",
    description: "Great for getting started with a few disputes.",
    features: ["3 AI-generated dispute letters", "FCRA-compliant formatting", "Email support", "Progress tracking"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$299",
    description: "Our most popular package for comprehensive credit repair.",
    features: [
      "7 AI-generated dispute letters",
      "FCRA-compliant formatting",
      "Priority support",
      "Progress tracking",
      "Credit report analysis",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$499",
    description: "Maximum coverage for clients with extensive repair needs.",
    features: [
      "15 AI-generated dispute letters",
      "FCRA-compliant formatting",
      "Priority support",
      "Progress tracking",
      "Dedicated specialist",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default async function HomePage() {
  const stats = await fetchStats();
  const resolved = stats?.resolvedDisputes ?? 0;
  const clients = stats?.totalClients ?? 0;
  const revenue = stats?.totalRevenue ?? 0;

  const fmtRevenue = revenue >= 1000000
    ? `$${(revenue / 1000000).toFixed(1)}M`
    : revenue >= 1000
    ? `$${(revenue / 1000).toFixed(1)}k`
    : `$${revenue.toFixed(0)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">ClearCredit</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100 py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                AI-Powered Credit Repair Platform
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl leading-tight">
                Fix Credit Faster with{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  AI & Automation
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                ClearCredit automatically pulls credit reports, identifies inaccurate items, generates FCRA-compliant dispute letters, and tracks progress — so you can focus on growing your business.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                    Client Login
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  No setup fees
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  One-time purchase
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  FCRA compliant
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-slate-200/50 border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Credit Score Overview</p>
                    <p className="text-xs text-muted-foreground">Updated today</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-xs font-medium text-success">
                    <TrendingUp className="h-3 w-3" />
                    +47 pts
                  </div>
                </div>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-5xl font-bold">682</span>
                  <span className="text-sm text-muted-foreground">Experian</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Payment History", pct: 92, color: "bg-emerald-500" },
                    { label: "Credit Utilization", pct: 78, color: "bg-amber-500" },
                    { label: "Length of History", pct: 65, color: "bg-blue-500" },
                    { label: "Credit Mix", pct: 55, color: "bg-primary" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">3 new disputes drafted</p>
                      <p className="text-[10px] text-muted-foreground">AI generated letters ready for review</p>
                    </div>
                    <Clock className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: resolved > 0 ? `${resolved.toLocaleString()}+` : "—", label: "Disputes Resolved" },
              { value: fmtRevenue, label: "Credit Improvements" },
              { value: clients > 0 ? `${clients}` : "—", label: "Active Clients" },
              { value: "30-day", label: "Average Response Time" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything You Need to Repair Credit</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-powered report analysis to automated FCRA letter generation, ClearCredit handles the heavy lifting.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all border-border/60">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-white to-blue-50/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Four simple steps from signup to dispute resolution.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Upload Report",
                description: "Clients upload or paste their credit report from any bureau.",
              },
              {
                step: "02",
                title: "AI Analysis",
                description: "Our AI scans for inaccurate, outdated, or unverifiable items.",
              },
              {
                step: "03",
                title: "Auto-Generate Letters",
                description: "FCRA-compliant dispute letters are drafted for each item.",
              },
              {
                step: "04",
                title: "Track Progress",
                description: "Monitor every dispute from submission to resolution in real time.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-5xl font-extrabold text-primary/10 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the dispute package that fits your needs. All packages include AI-generated FCRA dispute letters.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={`relative flex flex-col ${
                  pkg.highlighted
                    ? "border-primary shadow-xl shadow-primary/10 scale-105 z-10"
                    : "border-border/60"
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold">{pkg.price}</span>
                    <span className="ml-1 text-sm text-muted-foreground">one-time</span>
                  </div>
                  <ul className="mt-6 space-y-3 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-6">
                    <Button
                      variant={pkg.highlighted ? "primary" : "outline"}
                      className="w-full"
                    >
                      {pkg.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to Repair Your Credit?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Join hundreds of clients using ClearCredit to identify inaccurate credit items, generate FCRA dispute letters, and track progress to a better score.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
            <Link href="/signup">                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10 hover:text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold">ClearCredit</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ClearCredit. All rights reserved. FCRA-compliant credit repair services.
            </p>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
