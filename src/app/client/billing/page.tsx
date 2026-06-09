"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, AlertCircle, Sparkles, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientHeader } from "@/components/layout/client-header";

interface Invoice { id: string; amount: string; status: string; description: string; paidAt: string | null; createdAt: string }
interface ClientData { id: string; name: string; email: string; subscriptionStatus: string; stripeCustomerId: string | null; subscriptionPlan: string | null; disputeCredits: number; disputePackage: string | null; invoices: Invoice[] }
interface PublicPlan { key: string; name: string; price: string; priceSuffix: string; amountCents: number; disputes: number; active?: boolean; sortOrder?: number }

export default function ClientBillingPage() {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [packages, setPackages] = useState<PublicPlan[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<PublicPlan[]>([]);
  const [yearlyPlans, setYearlyPlans] = useState<PublicPlan[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/me").then((response) => response.json()), fetch("/api/pricing").then((response) => response.json())])
      .then(([meData, pricingData]) => {
        if (meData.client) setClient(meData.client);
        setPackages(pricingData.packages || []);
        setMonthlyPlans(pricingData.monthlyPlans || []);
        setYearlyPlans(pricingData.yearlyPlans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function startCheckout(kind: "package" | "subscription", key: string) {
    if (!client) return;
    setCheckoutLoading(`${kind}:${key}`);
    setMessage("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: client.email, name: client.name, clientId: client.id, package: kind === "package" ? key : undefined, plan: kind === "subscription" ? key : undefined, successUrl: "/client/dashboard?success=true", cancelUrl: "/client/billing?canceled=true" }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to start checkout");
      if (payload.url) window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open portal");
      if (data.url) window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><ClientHeader /><main className="mx-auto max-w-6xl px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-muted" /><div className="h-64 rounded-xl bg-muted" /></div></main></div>;

  const credits = client?.disputeCredits ?? 0;

  function renderSubscriptionCard(title: string, description: string, plans: PublicPlan[], badgeSuffix: string) {
    return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{plans.map((plan) => <div key={plan.key} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><p className="font-semibold">{plan.name}</p><Badge variant="outline">{plan.disputes}{badgeSuffix}</Badge></div><p className="mt-2 text-2xl font-bold">{plan.price}{plan.priceSuffix}</p><Button className="mt-4 w-full" variant="outline" onClick={() => startCheckout("subscription", plan.key)} isLoading={checkoutLoading === `subscription:${plan.key}`}>Start plan</Button></div>)}</CardContent></Card>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div><h1 className="text-2xl font-bold tracking-tight">Billing</h1><p className="mt-1 text-sm text-muted-foreground">Manage dispute credits, subscriptions, and payment history.</p></div>
        {message ? <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{message}</div> : null}
        <div className="grid gap-6 md:grid-cols-4"><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Dispute Credits</p><p className="mt-1 text-3xl font-bold">{credits}</p></CardContent></Card><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Current Package</p><p className="mt-1 text-xl font-semibold">{client?.disputePackage || "None"}</p></CardContent></Card><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Subscription</p><p className="mt-1 text-xl font-semibold">{client?.subscriptionPlan || "None"}</p></CardContent></Card><Card><CardContent className="p-6"><Button onClick={openPortal} isLoading={portalLoading} variant="outline" className="w-full"><ArrowUpRight className="h-4 w-4" />Manage payment methods</Button></CardContent></Card></div>
        {credits === 0 ? <div className="flex items-center gap-3 rounded-lg bg-warning/10 p-4 text-warning"><AlertCircle className="h-5 w-5" /><p className="text-sm font-medium">You have no dispute credits left. Purchase a package or renew a subscription to continue automation.</p></div> : null}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />One-time dispute packages</CardTitle><CardDescription>Best when you want to top up credits immediately.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">{packages.map((pkg) => <div key={pkg.key} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><p className="font-semibold">{pkg.name}</p><Badge variant="outline">{pkg.disputes} credits</Badge></div><p className="mt-2 text-2xl font-bold">{pkg.price}</p><Button className="mt-4 w-full" onClick={() => startCheckout("package", pkg.key)} isLoading={checkoutLoading === `package:${pkg.key}`}>Buy package</Button></div>)}</CardContent></Card>
          {renderSubscriptionCard("Monthly automation plans", "Recurring monthly billing with credits added every month.", monthlyPlans, "/mo")}
          {renderSubscriptionCard("Yearly automation plans", "Lower-touch annual billing with credits added every year.", yearlyPlans, "/yr")}
        </div>
        <Card><CardHeader><CardTitle>Payment History</CardTitle><CardDescription>Invoices and charges processed through Stripe.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{!client?.invoices?.length ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow> : client.invoices.map((invoice) => <TableRow key={invoice.id}><TableCell>{invoice.description || "Stripe invoice"}</TableCell><TableCell>${Number.parseFloat(invoice.amount || "0").toFixed(2)}</TableCell><TableCell><Badge variant={invoice.status === "PAID" ? "success" : "warning"}>{invoice.status}</Badge></TableCell><TableCell>{new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </main>
    </div>
  );
}
