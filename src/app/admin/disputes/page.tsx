"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Search,
  Send,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectOption } from "@/components/ui/select";

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface ReportItem {
  id: string;
  bureau: string | null;
  score: number | null;
  analyzedAt: string | null;
  createdAt: string;
  client: { name: string; email: string };
}

interface Dispute {
  id: string;
  bureau: string;
  type: string;
  description: string;
  creditor: string | null;
  accountNumber: string | null;
  amount: string | null;
  status: string;
  confidenceScore: number | null;
  createdAt: string;
  client: { name: string; email: string };
  letters: { id: string; templateType: string; generatedAt: string; content?: string }[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "RESOLVED":
      return "success" as const;
    case "IN_PROGRESS":
    case "DRAFTING":
    case "SENT":
      return "primary" as const;
    case "TO_DISPUTE":
    case "RESPONSE_RECEIVED":
      return "warning" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "default" as const;
  }
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [letterLoading, setLetterLoading] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState<string | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadForm, setUploadForm] = useState({
    clientId: "",
    bureau: "Experian",
    score: "",
    rawData: "",
    autoAnalyze: true,
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const [disputesRes, reportsRes, clientsRes] = await Promise.all([
        fetch("/api/disputes"),
        fetch("/api/reports/admin"),
        fetch("/api/clients"),
      ]);

      const disputesPayload = await disputesRes.json();
      const reportsPayload = await reportsRes.json();
      const clientsPayload = await clientsRes.json();

      setDisputes(Array.isArray(disputesPayload) ? disputesPayload : []);
      setReports(Array.isArray(reportsPayload.reports) ? reportsPayload.reports : []);
      const nextClients = Array.isArray(clientsPayload)
        ? clientsPayload.map((client) => ({ id: client.id, name: client.name, email: client.email }))
        : [];
      setClients(nextClients);
      setUploadForm((current) => ({ ...current, clientId: current.clientId || nextClients[0]?.id || "" }));
    } catch (error) {
      console.error("Failed to fetch disputes data", error);
      setMessage("Failed to load disputes workspace.");
    }
  }

  async function uploadReport() {
    setUploading(true);
    setMessage("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: uploadForm.clientId,
          bureau: uploadForm.bureau,
          score: uploadForm.score,
          rawData: uploadForm.rawData,
          autoAnalyze: uploadForm.autoAnalyze,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to upload report");
      }

      setShowUploadModal(false);
      setUploadForm((current) => ({ ...current, score: "", rawData: "", autoAnalyze: true }));
      setMessage(
        payload.analysis
          ? `Report uploaded and analyzed. ${payload.analysis.disputesCreated} dispute(s) created.`
          : "Report uploaded successfully.",
      );
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload report");
    } finally {
      setUploading(false);
    }
  }

  async function analyzeReport(reportId: string) {
    setAnalyzeLoading(reportId);
    setMessage("");

    try {
      const res = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to analyze report");
      }
      setMessage(
        payload.reusedExisting
          ? "This report was already analyzed; existing disputes were reused."
          : `Analysis completed. ${payload.disputesCreated} dispute(s) created and ${payload.lettersGenerated} letter(s) generated.`,
      );
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to analyze report");
    } finally {
      setAnalyzeLoading(null);
    }
  }

  async function updateStatus(disputeId: string, status: string) {
    try {
      await fetch(`/api/disputes/${disputeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadData();
      setSelectedDispute(null);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  }

  async function generateLetter(disputeId: string) {
    setLetterLoading(disputeId);
    try {
      const res = await fetch("/api/ai/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeItemId: disputeId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to generate letter");
      }
      setGeneratedLetter(payload.letter.content);
      setShowLetterModal(true);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate letter");
    } finally {
      setLetterLoading(null);
    }
  }

  const filteredDisputes = useMemo(
    () =>
      disputes.filter((dispute) => {
        const haystack = `${dispute.client.name} ${dispute.client.email} ${dispute.bureau} ${dispute.type} ${dispute.creditor || ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [disputes, search],
  );

  const pendingReports = reports.filter((report) => !report.analyzedAt);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <main className="space-y-8 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload reports, run AI analysis, and manage the full dispute queue from one workspace.
              </p>
            </div>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4" />
              Upload credit report
            </Button>
          </div>

          {message ? (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-4">
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Disputes</p><p className="text-2xl font-bold">{disputes.length}</p></div><ClipboardList className="h-8 w-8 text-primary" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Reports</p><p className="text-2xl font-bold">{pendingReports.length}</p></div><Upload className="h-8 w-8 text-amber-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Needs Review</p><p className="text-2xl font-bold">{disputes.filter((d) => d.status === "TO_DISPUTE").length}</p></div><AlertCircle className="h-8 w-8 text-amber-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{disputes.filter((d) => d.status === "RESOLVED").length}</p></div><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div></CardContent></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Credit Reports</CardTitle>
                <CardDescription>Each uploaded report can be analyzed into disputes automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reports.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No reports uploaded yet.
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{report.client.name}</p>
                          <p className="text-xs text-muted-foreground">{report.client.email}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {report.bureau || "Credit report"} • Score {report.score || "N/A"}
                          </p>
                        </div>
                        <Badge variant={report.analyzedAt ? "success" : "warning"}>
                          {report.analyzedAt ? "Analyzed" : "Pending"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(report.createdAt).toLocaleString()}</span>
                        <Button
                          variant={report.analyzedAt ? "outline" : "secondary"}
                          size="sm"
                          isLoading={analyzeLoading === report.id}
                          onClick={() => analyzeReport(report.id)}
                        >
                          <Sparkles className="h-4 w-4" />
                          {report.analyzedAt ? "Re-run analysis" : "Analyze with AI"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dispute Queue</CardTitle>
                <CardDescription>AI-generated disputes and manual follow-up workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, bureau, or creditor..." className="pl-10" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Dispute</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Letters</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisputes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No disputes created yet.</TableCell>
                      </TableRow>
                    ) : (
                      filteredDisputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{dispute.client.name}</p>
                              <p className="text-xs text-muted-foreground">{dispute.client.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{dispute.type}</p>
                              <p className="text-xs text-muted-foreground">{dispute.bureau} • {dispute.creditor || "Unknown creditor"}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={statusColor(dispute.status)}>{dispute.status.replaceAll("_", " ")}</Badge></TableCell>
                          <TableCell>{dispute.letters.length}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setSelectedDispute(dispute)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="secondary" size="sm" isLoading={letterLoading === dispute.id} onClick={() => generateLetter(dispute.id)}><Wand2 className="h-4 w-4" />AI Letter</Button>
                            </div>
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

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload credit report</DialogTitle>
            <DialogDescription>
              Paste the report text, select the client, and optionally run AI analysis immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Client</label>
                <Select value={uploadForm.clientId} onChange={(e) => setUploadForm((current) => ({ ...current, clientId: e.target.value }))}>
                  {clients.map((client) => (
                    <SelectOption key={client.id} value={client.id}>{client.name} — {client.email}</SelectOption>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bureau</label>
                <Select value={uploadForm.bureau} onChange={(e) => setUploadForm((current) => ({ ...current, bureau: e.target.value }))}>
                  {["Experian", "TransUnion", "Equifax", "Combined"].map((bureau) => (
                    <SelectOption key={bureau} value={bureau}>{bureau}</SelectOption>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Score</label>
                <Input value={uploadForm.score} onChange={(e) => setUploadForm((current) => ({ ...current, score: e.target.value }))} placeholder="620" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Credit report text</label>
              <Textarea rows={14} value={uploadForm.rawData} onChange={(e) => setUploadForm((current) => ({ ...current, rawData: e.target.value }))} placeholder="Paste the full bureau report text here..." />
            </div>

            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input type="checkbox" checked={uploadForm.autoAnalyze} onChange={(e) => setUploadForm((current) => ({ ...current, autoAnalyze: e.target.checked }))} />
              Run AI analysis immediately after upload
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={uploadReport} isLoading={uploading}>
                <Upload className="h-4 w-4" />
                Upload report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDispute)} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute details</DialogTitle>
            <DialogDescription>
              {selectedDispute?.client.name} • {selectedDispute?.bureau} • {selectedDispute?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{selectedDispute?.description}</p>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Creditor</p><p>{selectedDispute?.creditor || "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Account</p><p>{selectedDispute?.accountNumber || "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p><p>{selectedDispute?.amount || "—"}</p></div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Update status</p>
              <div className="flex flex-wrap gap-2">
                {["TO_DISPUTE", "IN_PROGRESS", "SENT", "RESPONSE_RECEIVED", "RESOLVED", "REJECTED"].map((status) => (
                  <Button key={status} variant={selectedDispute?.status === status ? "primary" : "outline"} size="sm" onClick={() => updateStatus(selectedDispute!.id, status)}>
                    {status.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
            {selectedDispute?.letters?.length ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Generated letters</p>
                {selectedDispute.letters.map((letter) => (
                  <Card key={letter.id} className="bg-muted/20">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{letter.templateType}</span></div><span className="text-xs text-muted-foreground">{new Date(letter.generatedAt).toLocaleDateString()}</span></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLetterModal} onOpenChange={setShowLetterModal}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-generated dispute letter</DialogTitle>
            <DialogDescription>Review, copy, and send this letter to the bureau.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/20 p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{generatedLetter}</pre>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLetterModal(false)}>Close</Button>
              <Button onClick={() => navigator.clipboard.writeText(generatedLetter)}><Send className="h-4 w-4" />Copy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
