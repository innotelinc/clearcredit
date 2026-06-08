"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, User, Plus, Minus, CreditCard, Mail, Phone, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMessage, setCreditMessage] = useState("");

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${params.id}`);
        const data = await res.json();
        setClient(data);
      } catch (error) {
        console.error("Failed to fetch client", error);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchClient();
  }, [params.id]);

  async function adjustCredits(amount: number) {
    if (!amount) return;
    setCreditLoading(true);
    setCreditMessage("");
    try {
      const res = await fetch(`/api/admin/clients/${params.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: creditReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setClient((prev: any) => ({ ...prev, disputeCredits: data.disputeCredits }));
        setCreditMessage(data.message);
        setCreditAmount("");
        setCreditReason("");
      } else {
        setCreditMessage(data.error || "Failed to update credits");
      }
    } catch (error) {
      setCreditMessage("Failed to update credits");
    } finally {
      setCreditLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="p-8">
          <div className="mb-6">
            <Link href="/admin/clients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-32 bg-muted rounded-xl" />
            </div>
          ) : client ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{client.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.status === "active" ? "success" : "warning"}>{client.status}</Badge>
                    <span className="text-sm text-muted-foreground">{client.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {client.phone || "N/A"}</p>
                    <p className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {client.email}</p>
                    <p><span className="text-muted-foreground">Address:</span> {client.address || "N/A"}</p>
                    <p><span className="text-muted-foreground">City:</span> {client.city || "N/A"}, {client.state} {client.zip}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Credit Info</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Credit Score:</span> {client.creditScore || "N/A"}</p>
                    <p><span className="text-muted-foreground">Disputes:</span> {client.disputes?.length || 0}</p>
                    <p><span className="text-muted-foreground">Reports:</span> {client.creditReports?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Joined:</span> {new Date(client.createdAt).toLocaleDateString()}</p>
                    <p><span className="text-muted-foreground">Subscription:</span> {client.subscriptionStatus}</p>
                    <p><span className="text-muted-foreground">Plan:</span> {client.subscriptionPlan || "None"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Dispute Credits</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{client.disputeCredits ?? 0}</p>
                        <p className="text-xs text-muted-foreground">remaining credits</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditAmount" className="text-xs">Adjust Credits</Label>
                      <div className="flex gap-2">
                        <Input
                          id="creditAmount"
                          type="number"
                          placeholder="Amount"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adjustCredits(parseInt(creditAmount || "0", 10))}
                          disabled={creditLoading || !creditAmount || parseInt(creditAmount, 10) === 0}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adjustCredits(-parseInt(creditAmount || "0", 10))}
                          disabled={creditLoading || !creditAmount || parseInt(creditAmount, 10) === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Reason (optional)"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        className="text-xs"
                      />
                      {creditMessage && (
                        <p className={`text-xs ${creditMessage.includes("Failed") ? "text-red-600" : "text-success"}`}>{creditMessage}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {client.activities?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  ) : (
                    <div className="space-y-3">
                      {client.activities?.map((activity: any) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">{activity.details}</p>
                            <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">Client not found.</p>
          )}
        </main>
      </div>
    </div>
  );
}
