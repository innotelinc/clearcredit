"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CreditCard,
  Activity,
  BarChart3,
  Upload,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectOption } from "@/components/ui/select";
import { ClientHeader } from "@/components/layout/client-header";

interface Dispute {
  id: string;
  type: string;
  status: string;
  bureau: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CreditReport {
  id: string;
  bureau: string | null;
  score: number | null;
  analyzedAt: string | null;
  createdAt: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  creditScore: number | null;
  status: string;
  subscriptionStatus: string;
  disputeCredits: number;
  disputePackage: string | null;
  disputes: Dispute[];
  creditReports: CreditReport[];
}

const statusSteps = [
  { key: "TO_DISPUTE", label: "To Dispute", icon: AlertCircle },
  { key: "DRAFTING", label: "Drafting Letter", icon: FileText },
  { key: "SENT", label: "Letter Sent", icon: ChevronRight },
  { key: "RESPONSE_RECEIVED", label: "Response Received", icon: Activity },
  { key: "RESOLVED", label: "Resolved", icon: CheckCircle2 },
];

const statusColor = (status: string) => {
  switch (status) {
    case "TO_DISPUTE": return "warning";
    case "DRAFTING": return "primary";
    case "SENT": return "primary";
    case "RESPONSE_RECEIVED": return "warning";
    case "RESOLVED": return "success";
    case "DELETED": return "success";
    default: return "default";
  }
};

export default function ClientDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportBureau, setReportBureau] = useState("Experian");
  const [reportScore, setReportScore] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchClientData() {
      try {
        const meRes = await fetch("/api/me");
        if (!meRes.ok) throw new Error("Failed to fetch profile");
        const me = await meRes.json();
        if (me.client) {
          setClientData(me.client);
        }
      } catch (error) {
        console.error("Failed to fetch client data", error);
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated") {
      fetchClientData();
    }
  }, [status]);

  async function handleUploadReport(e: React.FormEvent) {
    e.preventDefault();
    setUploadLoading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawData: reportText,
          bureau: reportBureau,
          score: reportScore ? parseInt(reportScore) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setShowUploadModal(false);
      setReportText("");
      setReportScore("");
      // Refresh data
      const [meRes, reportsRes] = await Promise.all([fetch("/api/me"), fetch("/api/reports")]);
      const me = await meRes.json();
      const reportsData = await reportsRes.json();
      if (me.client) setClientData({ ...me.client, creditReports: reportsData.reports || [] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAnalyzeReport(reportId: string) {
    setAnalyzeLoading(reportId);
    try {
      const res = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      // Refresh data
      const [meRes, reportsRes] = await Promise.all([fetch("/api/me"), fetch("/api/reports")]);
      const me = await meRes.json();
      const reportsData = await reportsRes.json();
      if (me.client) setClientData({ ...me.client, creditReports: reportsData.reports || [] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzeLoading(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientHeader />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const disputes = clientData?.disputes || [];
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED" || d.status === "DELETED").length;
  const inProgressCount = disputes.filter((d) => d.status !== "RESOLVED" && d.status !== "DELETED").length;

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {clientData?.name?.split(" ")[0] || "Client"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your credit repair progress and manage disputes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Credit Score</p>
                  <p className="text-3xl font-bold mt-1">{clientData?.creditScore || "—"}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              {clientData?.creditScore && (
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Credit score tracked</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Disputes</p>
                  <p className="text-3xl font-bold mt-1">{inProgressCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                {resolvedCount} resolved so far
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dispute Credits</p>
                  <p className="text-3xl font-bold mt-1">{clientData?.disputeCredits ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Package: {clientData?.disputePackage ? clientData.disputePackage.charAt(0).toUpperCase() + clientData.disputePackage.slice(1) : "None"}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  const pkg = clientData?.disputePackage || "standard";
                  fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: clientData?.email,
                      name: clientData?.name,
                      package: pkg,
                      clientId: clientData?.id,
                      successUrl: "/client/dashboard?success=true",
                      cancelUrl: "/client/billing?canceled=true",
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.url) window.location.href = data.url;
                    })
                    .catch(() => alert("Failed to start checkout. Please try again."));
                }}
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Buy More Credits
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Credit Reports */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Credit Reports</CardTitle>
              <CardDescription>Upload your credit reports for AI analysis</CardDescription>
            </div>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4" />
              Upload Report
            </Button>
          </CardHeader>
          <CardContent>
            {(!clientData?.creditReports || clientData.creditReports.length === 0) ? (
              <div className="text-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No credit reports uploaded yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Upload your Experian, TransUnion, or Equifax report to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientData.creditReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{report.bureau || "Credit Report"}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {report.score || "N/A"} &bull; Uploaded {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                        {report.analyzedAt && (
                          <Badge variant="success" className="mt-1">Analyzed</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!report.analyzedAt ? (
                        <Button size="sm" onClick={() => handleAnalyzeReport(report.id)} disabled={analyzeLoading === report.id}>
                          {analyzeLoading === report.id ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {analyzeLoading === report.id ? "Analyzing..." : "Analyze with AI"}
                        </Button>
                      ) : (
                        <Badge variant="outline">Analyzed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Disputes</CardTitle>
              <CardDescription>Track the status of all your credit disputes</CardDescription>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No disputes yet. Your credit repair specialist will add disputes once your credit report is analyzed.
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes.map((dispute) => (
                    <div key={dispute.id} className="rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            dispute.status === "RESOLVED" || dispute.status === "DELETED"
                              ? "bg-emerald-50"
                              : "bg-blue-50"
                          }`}>
                            {dispute.status === "RESOLVED" || dispute.status === "DELETED" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{dispute.type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{dispute.bureau} &bull; {dispute.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={statusColor(dispute.status)}>
                                {dispute.status.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Updated {new Date(dispute.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Tracker */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between">
                          {statusSteps.map((step, idx) => {
                            const stepIndex = statusSteps.findIndex((s) => s.key === dispute.status);
                            const isCompleted = idx <= stepIndex;
                            const isCurrent = idx === stepIndex;
                            return (
                              <div key={step.key} className="flex flex-col items-center relative flex-1">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors z-10 ${
                                    isCompleted
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "bg-card border-border text-muted-foreground"
                                  } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                                >
                                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                                </div>
                                <span className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                                  {step.label}
                                </span>
                                {idx < statusSteps.length - 1 && (
                                  <div
                                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                                      idx < stepIndex ? "bg-primary" : "bg-border"
                                    }`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
              <CardDescription>Your credit repair journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Disputes Resolved</span>
                    <span className="text-sm font-bold">{resolvedCount} / {disputes.length}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${disputes.length > 0 ? (resolvedCount / disputes.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Letters Sent</span>
                    <span className="text-sm font-bold">{inProgressCount + resolvedCount} / {disputes.length * 2}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${disputes.length > 0 ? ((inProgressCount + resolvedCount) / (disputes.length * 2)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Service Status</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your credit repair service is active. Our team is working on disputes and will update progress here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Next Steps</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc pl-3">
                        <li>Credit report analysis pending</li>
                        <li>Dispute letters will be drafted within 48 hours</li>
                        <li>Expect bureau responses in 30-45 days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Upload Credit Report</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => { setShowUploadModal(false); setUploadError(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleUploadReport} className="p-6 space-y-4">
              {uploadError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {uploadError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Credit Bureau</label>
                <Select value={reportBureau} onChange={(e) => setReportBureau(e.target.value)}>
                  <SelectOption>Experian</SelectOption>
                  <SelectOption>TransUnion</SelectOption>
                  <SelectOption>Equifax</SelectOption>
                  <SelectOption>Combined</SelectOption>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Credit Score (optional)</label>
                <Input
                  type="number"
                  value={reportScore}
                  onChange={(e) => setReportScore(e.target.value)}
                  placeholder="e.g. 650"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Content</label>
                <p className="text-xs text-muted-foreground">
                  Copy and paste the full text of your credit report here. Our AI will analyze it for inaccurate items.
                </p>
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Paste your credit report text here..."
                  rows={8}
                  required
                  className="font-mono resize-y"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowUploadModal(false); setUploadError(""); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadLoading || !reportText.trim()} isLoading={uploadLoading}>
                  <Upload className="h-4 w-4" />
                  Upload & Analyze
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
