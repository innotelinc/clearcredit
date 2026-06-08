"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

export default function AdminContractsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage service agreements</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Service Contracts</CardTitle>
              <CardDescription>All signed service agreements will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Contract management interface coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
