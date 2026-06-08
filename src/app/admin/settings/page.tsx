"use client";

import { useEffect, useState } from "react";
import { Bot, Building2, CreditCard, Mail, Play, Save, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SettingsResponse {
  business: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    plan: string;
  };
  integrations: {
    stripeConfigured: boolean;
    webhookConfigured: boolean;
    openAiConfigured: boolean;
    resendConfigured: boolean;
    reportProviderConfigured: boolean;
  };
  automation: {
    reportPullMode: string;
    autoAnalyzePulledReports: boolean;
    providerBaseUrl: string | null;
    callbackUrl: string;
    lastRun: {
      status: string;
      summary: string | null;
      startedAt: string;
      completedAt: string | null;
    } | null;
  };
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", address: "", phone: "", plan: "STARTER" });

  async function fetchSettingsData() {
    const res = await fetch("/api/settings");
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to load settings");
    return payload as SettingsResponse;
  }

  async function loadSettings() {
    try {
      const payload = await fetchSettingsData();
      setData(payload);
      setForm({
        name: payload.business.name || "",
        address: payload.business.address || "",
        phone: payload.business.phone || "",
        plan: payload.business.plan || "STARTER",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void fetchSettingsData()
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setForm({
          name: payload.business.name || "",
          address: payload.business.address || "",
          phone: payload.business.phone || "",
          plan: payload.business.plan || "STARTER",
        });
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Failed to load settings");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to save settings");
      setData((current) => (current ? { ...current, business: payload.business } : current));
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function runAutomation() {
    setRunningAutomation(true);
    setMessage("");
    try {
      const res = await fetch("/api/automation/run", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to run automation");
      setMessage(`Automation completed. ${payload.summary.reportsAnalyzed} reports analyzed, ${payload.summary.lettersGenerated} letters generated.`);
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to run automation");
    } finally {
      setRunningAutomation(false);
    }
  }

  const integrationCards = data
    ? [
        { label: "Stripe", ok: data.integrations.stripeConfigured && data.integrations.webhookConfigured, icon: CreditCard },
        { label: "OpenAI", ok: data.integrations.openAiConfigured, icon: Sparkles },
        { label: "Resend", ok: data.integrations.resendConfigured, icon: Mail },
        { label: "Report Provider", ok: data.integrations.reportProviderConfigured || data.automation.reportPullMode === "mock", icon: Bot },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <main className="space-y-8 p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage business profile, integrations, and automation status.</p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4"><div className="h-40 rounded-xl bg-muted" /><div className="h-48 rounded-xl bg-muted" /></div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Business Profile</CardTitle>
                  <CardDescription>These values power contracts, invoices, and admin-facing copy.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-medium">Business name</label><Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
                  <div><label className="mb-2 block text-sm font-medium">Plan</label><Input value={form.plan} onChange={(e) => setForm((current) => ({ ...current, plan: e.target.value }))} /></div>
                  <div><label className="mb-2 block text-sm font-medium">Phone</label><Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} /></div>
                  <div><label className="mb-2 block text-sm font-medium">Address</label><Input value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} /></div>
                  <div className="md:col-span-2 flex items-center gap-3"><Button onClick={saveSettings} isLoading={saving}><Save className="h-4 w-4" />Save settings</Button>{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}</div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {integrationCards.map((item) => (
                  <Card key={item.label}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold">{item.ok ? "Configured" : "Needs attention"}</p>
                      </div>
                      <div className="flex items-center gap-2"><Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "Ready" : "Missing"}</Badge><item.icon className="h-5 w-5 text-primary" /></div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Automation Control Center</CardTitle>
                    <CardDescription>Provider-backed report pulling, structured parsing, and follow-up automation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Report pull mode</p><p className="mt-1 font-semibold">{data.automation.reportPullMode}</p></div>
                      <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Auto analyze</p><p className="mt-1 font-semibold">{data.automation.autoAnalyzePulledReports ? "Enabled" : "Disabled"}</p></div>
                      <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Provider URL</p><p className="mt-1 break-all font-semibold">{data.automation.providerBaseUrl || "Not configured"}</p></div>
                      <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Webhook callback</p><p className="mt-1 break-all font-semibold">{data.automation.callbackUrl}</p></div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="font-medium">Last automation run</p>
                      {data.automation.lastRun ? (
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <p>Status: <span className="font-medium text-foreground">{data.automation.lastRun.status}</span></p>
                          <p>Started: <span className="font-medium text-foreground">{new Date(data.automation.lastRun.startedAt).toLocaleString()}</span></p>
                          <p>Completed: <span className="font-medium text-foreground">{data.automation.lastRun.completedAt ? new Date(data.automation.lastRun.completedAt).toLocaleString() : "Still running"}</span></p>
                          <p>Summary: <span className="font-medium text-foreground">{data.automation.lastRun.summary || "—"}</span></p>
                        </div>
                      ) : (
                        <p className="mt-2 text-muted-foreground">No automation runs yet.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={runAutomation} isLoading={runningAutomation}><Play className="h-4 w-4" />Run automation now</Button>
                      <p className="text-muted-foreground">Use generic provider mode for a real provider integration, or mock mode for local demos.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
