"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle2, AlertCircle, Clock, XCircle, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientHeader } from "@/components/layout/client-header";

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
  letters: { id: string; templateType: string; generatedAt: string; content: string }[];
}

export default function ClientDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.client?.disputes) {
          setDisputes(data.client.disputes);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-muted" /><div className="h-64 rounded-xl bg-muted" /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">My Disputes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track the status of your credit disputes and view generated letters</p>
        </div>

        {disputes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><FileText className="h-6 w-6 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground">No disputes yet. Disputes will appear here once your credit report is analyzed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Card key={dispute.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2"><Badge variant="outline">{dispute.bureau}</Badge><Badge variant={statusColor(dispute.status)}><span className="flex items-center gap-1">{statusIcon(dispute.status)}{dispute.status.replace("_", " ")}</span></Badge></div>
                        <h3 className="text-lg font-semibold">{dispute.type}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{dispute.description}</p>
                      </div>
                      {dispute.confidenceScore && <div className="text-right"><p className="text-xs text-muted-foreground">AI Confidence</p><p className="text-lg font-bold text-primary">{dispute.confidenceScore}%</p></div>}
                    </div>

                    <div className="mb-4 grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Creditor</p><p className="text-sm font-medium">{dispute.creditor || "—"}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Account</p><p className="text-sm font-medium">{dispute.accountNumber || "—"}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-medium">{dispute.amount || "—"}</p></div>
                    </div>

                    {dispute.letters.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Generated Letters</p>
                        {dispute.letters.map((letter) => (
                          <div key={letter.id} className="rounded-lg border border-border bg-muted/20 p-4">
                            <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{letter.templateType.replace("_", " ")}</span></div><span className="text-xs text-muted-foreground">{new Date(letter.generatedAt).toLocaleDateString()}</span></div>
                            <div className="max-h-48 overflow-y-auto rounded bg-muted/40 p-3"><pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{letter.content}</pre></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
