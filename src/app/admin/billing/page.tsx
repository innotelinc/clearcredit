"use client";

import { useEffect, useState } from "react";
import { CreditCard, DollarSign, Users, TrendingUp, Download, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

interface Invoice {
  id: string;
  amount: string;
  status: string;
  description: string;
  paidAt: string | null;
  createdAt: string;
  client: { name: string; email: string } | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
  disputeCredits: number;
  disputePackage: string | null;
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    try {
      const [invRes, clientRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/clients"),
      ]);
      const invData = await invRes.json();
      const clientData = await clientRes.json();
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(clientData)) setClients(clientData);
    } catch (error) {
      console.error("Failed to fetch billing data", error);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const activeClients = clients.filter((c) => c.disputeCredits > 0).length;
  const totalCredits = clients.reduce((sum, c) => sum + (c.disputeCredits || 0), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "DRAFT":
        return "warning";
      case "OVERDUE":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Billing & Packages</h1>
            <p className="text-sm text-muted-foreground mt-1">Stripe-integrated revenue and dispute package management</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                    <p className="text-2xl font-bold">{activeClients}</p>
                  </div>
                  <Users className="h-8 w-8 text-success opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                    <p className="text-2xl font-bold">{totalCredits}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-warning opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoices</p>
                    <p className="text-2xl font-bold">{invoices.length}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest payments and billing activity</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No invoices yet. They will appear here once Stripe payments are processed.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.slice(0, 10).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{inv.client?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{inv.client?.email || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${parseFloat(inv.amount || "0").toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColor(inv.status)}>{inv.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Packages</CardTitle>
                <CardDescription>Dispute credit overview per client</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Package</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No clients found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.slice(0, 10).map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={client.disputeCredits > 0 ? "success" : "warning"}>
                              {client.disputeCredits} left
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.disputePackage ? (
                              <span className="text-xs text-muted-foreground capitalize">{client.disputePackage}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No package</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
