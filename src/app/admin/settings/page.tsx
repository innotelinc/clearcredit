"use client";

import { useEffect, useState } from "react";
import { Building2, Bot, CreditCard, Mail, Save, Sparkles } from "lucide-react";
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
  };
  automation: {
    reportPullMode: string;
    autoAnalyzePulledReports: boolean;
  };
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", address: "", phone: "", plan: "STARTER" });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to load settings");
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

    void loadSettings();
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

  const integrationCards = data
    ? [
        { label: "Stripe", ok: data.integrations.stripeConfigured && data.integrations.webhookConfigured, icon: CreditCard },
        { label: "OpenAI", ok: data.integrations.openAiConfigured, icon: Sparkles },
        { label: "Resend", ok: data.integrations.resendConfigured, icon: Mail },
        { label: "Report Automation", ok: data.automation.reportPullMode === "mock", icon: Bot },
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
            <p className="mt-1 text-sm text-muted-foreground">
              Manage business profile, integrations, and automation status.
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-40 rounded-xl bg-muted" />
              <div className="h-48 rounded-xl bg-muted" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Business Profile
                  </CardTitle>
                  <CardDescription>These values power contracts, invoices, and admin-facing copy.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Business name</label>
                    <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Plan</label>
                    <Input value={form.plan} onChange={(e) => setForm((current) => ({ ...current, plan: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Address</label>
                    <Input value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <Button onClick={saveSettings} isLoading={saving}>
                      <Save className="h-4 w-4" />
                      Save settings
                    </Button>
                    {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
                  </div>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "Ready" : "Missing"}</Badge>
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Automation</CardTitle>
                    <CardDescription>
                      Report pulling currently runs in <span className="font-medium">{data.automation.reportPullMode}</span> mode.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Auto-analyze pulled reports: <span className="font-medium text-foreground">{data.automation.autoAnalyzePulledReports ? "Enabled" : "Disabled"}</span>
                    </p>
                    <p>
                      To enable a fully automatic sign-up → report → disputes flow in production, connect a real report provider and expose its credentials through the server environment.
                    </p>
                    <p>
                      For local/demo automation, set <code>REPORT_PULL_MODE=mock</code> and optionally <code>AUTO_ANALYZE_PULLED_REPORTS=true</code>.
                    </p>
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
