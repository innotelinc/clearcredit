"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSignature, FileText, PenLine } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Contract {
  id: string;
  title: string;
  content: string;
  services: string;
  monthlyFee: string;
  status: string;
  startDate: string;
  endDate: string | null;
  signedAt: string | null;
  client: { id: string; name: string; email: string };
}

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    async function loadContracts() {
      try {
        const res = await fetch("/api/contracts");
        const payload = await res.json();
        if (Array.isArray(payload)) {
          setContracts(payload);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadContracts();
  }, []);

  const stats = useMemo(() => ({
    total: contracts.length,
    signed: contracts.filter((contract) => contract.status === "signed").length,
    pending: contracts.filter((contract) => contract.status !== "signed").length,
  }), [contracts]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <main className="space-y-8 p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review service agreements generated during sign-up and confirm signature status.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Total Contracts</p><p className="text-2xl font-bold">{stats.total}</p></div><FileText className="h-8 w-8 text-primary" /></CardContent></Card>
            <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Signed</p><p className="text-2xl font-bold">{stats.signed}</p></div><PenLine className="h-8 w-8 text-emerald-600" /></CardContent></Card>
            <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div><FileSignature className="h-8 w-8 text-amber-600" /></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Service Agreements</CardTitle>
              <CardDescription>Contracts captured from the checkout and onboarding flow.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading contracts…</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No contracts have been created yet.</TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{contract.client.name}</p>
                              <p className="text-xs text-muted-foreground">{contract.client.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{contract.title}</TableCell>
                          <TableCell>${Number(contract.monthlyFee || 0).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={contract.status === "signed" ? "success" : "warning"}>{contract.status}</Badge></TableCell>
                          <TableCell>{contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setSelectedContract(contract)}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={Boolean(selectedContract)} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>
              {selectedContract?.client.name} • {selectedContract?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Services</p>
                <p className="mt-1 whitespace-pre-wrap">{selectedContract?.services}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Term</p>
                <p className="mt-1">
                  {selectedContract?.startDate ? new Date(selectedContract.startDate).toLocaleDateString() : "—"}
                  {selectedContract?.endDate ? ` → ${new Date(selectedContract.endDate).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contract Body</p>
              <div className="mt-2 rounded-lg border bg-muted/20 p-4 whitespace-pre-wrap leading-relaxed">
                {selectedContract?.content}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
