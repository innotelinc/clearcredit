"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search, Wand2, FileText, Eye, Send, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

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
  letters: { id: string; templateType: string; generatedAt: string; content: string }[];
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [letterLoading, setLetterLoading] = useState<string | null>(null);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>("");

  useEffect(() => {
    void fetchDisputes();
  }, []);

  async function fetchDisputes() {
    try {
      const res = await fetch("/api/disputes");
      const data = await res.json();
      if (Array.isArray(data)) setDisputes(data);
    } catch (error) {
      console.error("Failed to fetch disputes", error);
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
      const data = await res.json();
      if (data.letter?.content) {
        setGeneratedLetter(data.letter.content);
        setShowLetterModal(true);
        void fetchDisputes();
      }
    } catch (error) {
      console.error("Failed to generate letter", error);
    } finally {
      setLetterLoading(null);
    }
  }

  async function updateStatus(disputeId: string, status: string) {
    try {
      await fetch(`/api/disputes/${disputeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      void fetchDisputes();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  }

  const filteredDisputes = disputes.filter((dispute) =>
    dispute.client.name.toLowerCase().includes(search.toLowerCase()) ||
    dispute.bureau.toLowerCase().includes(search.toLowerCase()) ||
    dispute.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "RESOLVED": return "success";
      case "IN_PROGRESS": return "primary";
      case "TO_DISPUTE": return "warning";
      case "REJECTED": return "danger";
      default: return "default";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "RESOLVED": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "IN_PROGRESS": return <Clock className="h-4 w-4 text-primary" />;
      case "REJECTED": return <XCircle className="h-4 w-4 text-danger" />;
      default: return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <main className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage credit disputes and generate AI letters</p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Disputes</p><p className="text-2xl font-bold">{disputes.length}</p></div><ClipboardList className="h-8 w-8 text-primary opacity-80" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{disputes.filter((dispute) => dispute.status === "TO_DISPUTE").length}</p></div><AlertCircle className="h-8 w-8 text-warning opacity-80" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold">{disputes.filter((dispute) => dispute.status === "IN_PROGRESS").length}</p></div><Clock className="h-8 w-8 text-primary opacity-80" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{disputes.filter((dispute) => dispute.status === "RESOLVED").length}</p></div><CheckCircle2 className="h-8 w-8 text-success opacity-80" /></div></CardContent></Card>
          </div>

          <Card className="mb-6">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Bureau</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Creditor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Letters</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No disputes found. Disputes will appear here once created from credit reports.</TableCell>
                    </TableRow>
                  ) : (
                    filteredDisputes.map((dispute) => (
                      <TableRow key={dispute.id}>
                        <TableCell><div><p className="text-sm font-medium">{dispute.client.name}</p><p className="text-xs text-muted-foreground">{dispute.client.email}</p></div></TableCell>
                        <TableCell><Badge variant="outline">{dispute.bureau}</Badge></TableCell>
                        <TableCell><span className="text-sm">{dispute.type}</span></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{dispute.creditor || "—"}</span></TableCell>
                        <TableCell><div className="flex items-center gap-2">{statusIcon(dispute.status)}<Badge variant={statusColor(dispute.status)}>{dispute.status.replace("_", " ")}</Badge></div></TableCell>
                        <TableCell><span className="text-sm font-medium">{dispute.letters.length}</span></TableCell>
                        <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSelectedDispute(dispute)}><Eye className="h-4 w-4" /></Button><Button variant="secondary" size="sm" onClick={() => generateLetter(dispute.id)} isLoading={letterLoading === dispute.id}><Wand2 className="mr-1 h-4 w-4" />AI Letter</Button></div></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>{selectedDispute?.client.name} — {selectedDispute?.bureau} — {selectedDispute?.type}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Account Number</p><p className="text-sm font-medium">{selectedDispute?.accountNumber || "—"}</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-medium">{selectedDispute?.amount || "—"}</p></div>
            </div>
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{selectedDispute?.description}</p></div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Update Status</p>
              <div className="flex gap-2">
                {["TO_DISPUTE", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((status) => (
                  <Button
                    key={status}
                    variant={selectedDispute?.status === status ? "primary" : "outline"}
                    size="sm"
                    onClick={async () => {
                      if (selectedDispute) {
                        await updateStatus(selectedDispute.id, status);
                      }
                      setSelectedDispute(null);
                    }}
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
            {selectedDispute?.letters && selectedDispute.letters.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Generated Letters</p>
                {selectedDispute.letters.map((letter) => (
                  <Card key={letter.id} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{letter.templateType}</span></div><span className="text-xs text-muted-foreground">{new Date(letter.generatedAt).toLocaleDateString()}</span></div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{letter.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLetterModal} onOpenChange={setShowLetterModal}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />AI-Generated FCRA Dispute Letter</DialogTitle>
            <DialogDescription>Review the generated letter below. You can copy it and send it to the credit bureau.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-border bg-muted/30 p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{generatedLetter}</pre>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLetterModal(false)}>Close</Button>
              <Button onClick={() => { void navigator.clipboard.writeText(generatedLetter); }}><Send className="mr-2 h-4 w-4" />Copy to Clipboard</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
