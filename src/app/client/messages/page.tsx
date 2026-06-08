"use client";

import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClientHeader } from "@/components/layout/client-header";

export default function ClientMessagesPage() {
  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Messages</h1>
        <Card>
          <CardHeader>
            <CardTitle>Communications</CardTitle>
            <CardDescription>Messages from your credit repair specialist.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Messaging center coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
