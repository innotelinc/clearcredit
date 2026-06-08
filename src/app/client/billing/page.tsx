"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, Download, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientHeader } from "@/components/layout/client-header";

interface Invoice {
  id: string;
  amount: string;
  status: string;
  description: string;
  paidAt: string | null;
  createdAt: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionPlan: string | null;
  disputeCredits: number;
  disputePackage: string | null;
  invoices: Invoice[];
}

export default function ClientBillingPage() {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.client) {
          setClient(data.client);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "PAID": return "success";
      case "DRAFT": return "warning";
      case "OVERDUE": return "danger";
      default: return "default";
    }
  };

  const credits = client?.disputeCredits ?? 0;
  const pkgName = client?.disputePackage || "None";

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your dispute packages and payment history</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dispute Credits</p>
                  <p className="text-xl font-bold">{credits} remaining</p>
                </div>
                <Badge variant={credits > 0 ? "success" : "warning"}>
                  {credits > 0 ? "Active" : "No Credits"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{client?.subscriptionPlan ? "Subscription" : "Current Package"}</p>
                  <p className="text-xl font-bold">
                    {client?.subscriptionPlan
                      ? client.subscriptionPlan.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
                      : pkgName === "None"
                      ? "—"
                      : pkgName.charAt(0).toUpperCase() + pkgName.slice(1)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-primary opacity-80" />
              </div>
              {client?.subscriptionPlan && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Renews monthly • {client.subscriptionStatus === "active" ? "Active" : client.subscriptionStatus}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-center">
              <Button
                onClick={() => {
                  const pkg = client?.disputePackage || "standard";
                  fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: client?.email,
                      name: client?.name,
                      package: pkg,
                      clientId: client?.id,
                      successUrl: `${window.location.origin}/client/dashboard?success=true`,
                      cancelUrl: `${window.location.origin}/client/billing?canceled=true`,
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.url) window.location.href = data.url;
                    })
                    .catch(() => alert("Failed to start checkout. Please try again."));
                }}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Buy More Credits
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-center">
              <Button onClick={openPortal} isLoading={portalLoading} variant="outline" className="w-full">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Manage Payment Methods
              </Button>
            </CardContent>
          </Card>
        </div>

        {credits === 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-warning/10 p-4 text-warning">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">You have no dispute credits left. Purchase a new package to continue filing disputes.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Invoices and payments for your account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!client?.invoices?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No invoices yet. They will appear here once payments are processed.
                    </TableCell>
                  </TableRow>
                ) : (
                  client.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{inv.description || "Subscription"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${parseFloat(inv.amount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
