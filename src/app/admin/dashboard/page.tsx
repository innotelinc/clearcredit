"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Activity,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

interface DashboardStats {
  totalClients: number;
  activeDisputes: number;
  lettersGenerated: number;
  monthlyRevenue: number;
  revenueChange: number;
  clientChange: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  creditScore: number | null;
  status: string;
}

interface Dispute {
  id: string;
  type: string;
  status: string;
  bureau: string;
  client: { name: string };
}

interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
}

interface CreditReportItem {
  id: string;
  bureau: string | null;
  score: number | null;
  analyzedAt: string | null;
  createdAt: string;
  client: { name: string; email: string };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeDisputes: 0,
    lettersGenerated: 0,
    monthlyRevenue: 0,
    revenueChange: 12,
    clientChange: 8,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activities] = useState<ActivityItem[]>([]);
  const [reports, setReports] = useState<CreditReportItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, disputesRes, reportsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/disputes"),
          fetch("/api/reports/admin"),
        ]);

        const clientsData = await clientsRes.json();
        const disputesData = await disputesRes.json();
        const reportsData = reportsRes.ok ? await reportsRes.json() : null;

        if (Array.isArray(clientsData)) {
          setClients(clientsData.slice(0, 5));
          setStats((current) => ({
            ...current,
            totalClients: clientsData.length,
            activeDisputes: Array.isArray(disputesData)
              ? disputesData.filter((dispute: Dispute) => dispute.status !== "RESOLVED" && dispute.status !== "DELETED").length
              : 0,
            lettersGenerated: Array.isArray(disputesData) ? disputesData.length * 2 : 0,
            monthlyRevenue: clientsData.length * 99,
          }));
        }

        if (Array.isArray(disputesData)) {
          setDisputes(disputesData.slice(0, 5));
        }

        if (reportsData && Array.isArray(reportsData.reports)) {
          setReports(reportsData.reports.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    }

    void fetchData();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "danger";
      case "TO_DISPUTE":
        return "warning";
      case "DRAFTING":
      case "SENT":
        return "primary";
      case "RESPONSE_RECEIVED":
        return "warning";
      case "RESOLVED":
      case "DELETED":
        return "success";
      default:
        return "default";
    }
  };

  const statCards = [
    { title: "Total Clients", value: stats.totalClients, change: stats.clientChange, icon: Users, changeLabel: "this month" },
    { title: "Active Disputes", value: stats.activeDisputes, change: 3, icon: ClipboardList, changeLabel: "new today" },
    { title: "Letters Generated", value: stats.lettersGenerated, change: 15, icon: FileText, changeLabel: "this month" },
    { title: "Monthly Revenue", value: `$${stats.monthlyRevenue.toLocaleString()}`, change: stats.revenueChange, icon: DollarSign, changeLabel: "vs last month" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <main className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Overview of your credit repair business</p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/clients/new">
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
              </Link>
              <Link href="/admin/disputes">
                <Button><ClipboardList className="mr-2 h-4 w-4" /> New Dispute</Button>
              </Link>
            </div>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    {stat.change >= 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                    )}
                    <span className={stat.change >= 0 ? "text-success" : "text-destructive"}>{Math.abs(stat.change)}%</span>
                    <span className="ml-1 text-muted-foreground">{stat.changeLabel}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Clients</CardTitle>
                <CardDescription>Latest clients added to your platform</CardDescription>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No clients yet. <Link href="/admin/clients/new" className="text-primary hover:underline">Add your first client</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {client.name.split(" ").map((namePart) => namePart[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{client.creditScore || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Credit Score</p>
                          </div>
                          <Badge variant={statusColor(client.status)}>{client.status}</Badge>
                          <Link href={`/admin/clients/${client.id}`}>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Platform initialized</p>
                        <p className="text-xs text-muted-foreground">Welcome to ClearCredit dashboard</p>
                      </div>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.details}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Credit Reports</CardTitle>
                <CardDescription>Recently uploaded reports pending analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No credit reports uploaded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <BarChart3 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{report.bureau || "Credit Report"}</p>
                            <p className="text-xs text-muted-foreground">{report.client.name} • Score: {report.score || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.analyzedAt ? <Badge variant="success">Analyzed</Badge> : <Badge variant="warning">Pending</Badge>}
                          <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Disputes</CardTitle>
                <CardDescription>Disputes currently in progress</CardDescription>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No active disputes. Create one from a client profile.</div>
                ) : (
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <div key={dispute.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                            <Clock className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{dispute.type}</p>
                            <p className="text-xs text-muted-foreground">{dispute.client.name} • {dispute.bureau}</p>
                          </div>
                        </div>
                        <Badge variant={statusColor(dispute.status)}>{dispute.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
