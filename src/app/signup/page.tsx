"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  { id: 1, title: "Account", description: "Create your account" },
  { id: 2, title: "Personal Info", description: "Your details" },
  { id: 3, title: "Authorization", description: "Credit report consent" },
  { id: 4, title: "Contract", description: "Service agreement" },
  { id: 5, title: "Payment", description: "Setup billing" },
];

const contractTemplate = `CREDIT REPAIR SERVICE AGREEMENT

This Credit Repair Service Agreement (the "Agreement") is entered into between ClearCredit (the "Company") and the undersigned client (the "Client").

1. SERVICES
The Company agrees to provide credit repair services including:
- Review and analysis of Client's credit reports
- Identification of inaccurate, outdated, or unverifiable information
- Preparation and submission of dispute letters to credit bureaus and creditors
- Progress tracking and status updates
- Ongoing consultation and support

2. CLIENT RESPONSIBILITIES
The Client agrees to:
- Provide accurate and complete information
- Cooperate with reasonable requests for documentation
- Review and approve dispute letters before submission
- Notify the Company of any changes to contact information

3. FEES
The Client agrees to pay the service fee as selected during signup (one-time package or monthly subscription). Each plan includes a set number of dispute credits. Additional credits may be purchased at any time.

4. TERM
This agreement begins on the date of execution and continues according to the selected plan (one-time packages provide a fixed number of credits; subscriptions renew monthly until cancelled).

5. AUTHORIZATION
The Client authorizes the Company to access and review their credit reports for the purpose of providing credit repair services.

6. LIMITATIONS
The Company does not guarantee specific results. The Client acknowledges that credit repair outcomes depend on numerous factors outside the Company's control.

By signing below, the Client acknowledges they have read, understood, and agree to the terms of this Agreement.`;

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    ssn: "",
    dateOfBirth: "",
    creditAuth: false,
    contractSigned: false,
    signature: "",
    package: "standard",
    plan: "standard_monthly",
    billingType: "package" as "package" | "subscription",
  });

  function updateField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep(step: number): string | null {
    switch (step) {
      case 1:
        if (!formData.name.trim()) return "Full name is required";
        if (!formData.email.trim()) return "Email is required";
        if (!formData.password || formData.password.length < 8) return "Password must be at least 8 characters";
        if (formData.password !== formData.confirmPassword) return "Passwords do not match";
        return null;
      case 2:
        if (!formData.phone.trim()) return "Phone number is required";
        if (!formData.address.trim()) return "Address is required";
        if (!formData.city.trim() || !formData.state.trim() || !formData.zip.trim()) return "City, state, and ZIP are required";
        return null;
      case 3:
        if (!formData.creditAuth) return "You must authorize credit report access";
        return null;
      case 4:
        if (!formData.contractSigned) return "You must sign the service agreement";
        if (!formData.signature.trim()) return "Signature is required";
        return null;
      case 5:
        return null;
      default:
        return null;
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const registrationRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          ssn: formData.ssn,
          dateOfBirth: formData.dateOfBirth,
          contractTitle: "Credit Repair Service Agreement",
          contractContent: contractTemplate,
          contractServices: "Full credit repair services including dispute letters, progress tracking, and consultation",
          monthlyFee:
            formData.billingType === "subscription"
              ? formData.plan === "basic_monthly"
                ? 49
                : formData.plan === "premium_monthly"
                  ? 149
                  : 99
              : formData.package === "basic"
                ? 149
                : formData.package === "premium"
                  ? 499
                  : 299,
          signedAt: new Date().toISOString(),
          signatureData: formData.signature,
          contractStatus: "signed",
        }),
      });

      if (!registrationRes.ok) {
        const err = await registrationRes.json();
        throw new Error(err.error || "Registration failed");
      }

      const registration = await registrationRes.json();

      const checkoutPayload: {
        email: string;
        name: string;
        clientId: string;
        successUrl: string;
        cancelUrl: string;
        plan?: string;
        package?: string;
      } = {
        email: formData.email,
        name: formData.name,
        clientId: registration.clientId,
        successUrl: "/client/dashboard?success=true",
        cancelUrl: "/signup?canceled=true",
      };
      if (formData.billingType === "subscription") {
        checkoutPayload.plan = formData.plan;
      } else {
        checkoutPayload.package = formData.package;
      }

      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });

      const checkoutData = await checkoutRes.json();
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
        return;
      }

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Payment setup failed. You can complete payment later from your billing page.");
      }

      window.location.href = "/client/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function nextStep() {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    if (currentStep < steps.length) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function prevStep() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Create Your Account</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="John Doe" value={formData.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} required />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" placeholder="(555) 123-4567" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="address" placeholder="123 Main St" value={formData.address} onChange={(e) => updateField("address", e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={formData.zip} onChange={(e) => updateField("zip", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssn">Social Security Number</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="ssn" type="password" placeholder="XXX-XX-XXXX" value={formData.ssn} onChange={(e) => updateField("ssn", e.target.value)} className="pl-10" />
              </div>
              <p className="text-xs text-muted-foreground">Your SSN is encrypted and used solely for credit report authorization.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="dob" type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Credit Report Authorization</h3>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Authorization for Credit Report Disclosure</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Under the Fair Credit Reporting Act (FCRA), I authorize ClearCredit to obtain and review my credit reports from Experian, TransUnion, and Equifax for the purpose of credit repair services.
                    </p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    I understand that:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    <li>This authorization is valid for the duration of my service agreement</li>
                    <li>I may revoke this authorization at any time by submitting written notice</li>
                    <li>My credit information will be handled in accordance with privacy laws</li>
                    <li>Hard inquiries may appear on my credit report</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.creditAuth}
                onChange={(e) => updateField("creditAuth", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium">I authorize ClearCredit to access my credit reports</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I have read and agree to the authorization terms above. I understand this is required for ClearCredit to provide dispute services on my behalf.
                </p>
              </div>
            </label>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Service Contract</h3>
            <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {contractTemplate}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature">Digital Signature</Label>
              <p className="text-xs text-muted-foreground">Type your full legal name to sign this contract electronically.</p>
              <Input
                id="signature"
                placeholder={`${formData.name || "Your Full Legal Name"}`}
                value={formData.signature}
                onChange={(e) => updateField("signature", e.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.contractSigned}
                onChange={(e) => {
                  updateField("contractSigned", e.target.checked);
                  if (e.target.checked && !formData.signature) {
                    updateField("signature", formData.name);
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium">I agree to the Service Agreement</p>
                <p className="text-xs text-muted-foreground mt-1">
                  By checking this box and typing my name above, I agree to be bound by the terms of this Credit Repair Service Agreement.
                </p>
              </div>
            </label>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Your Plan</h3>
            <div className="flex rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => updateField("billingType", "package")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  formData.billingType === "package"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                One-Time Package
              </button>
              <button
                type="button"
                onClick={() => updateField("billingType", "subscription")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  formData.billingType === "subscription"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Subscription
              </button>
            </div>

            {formData.billingType === "package" ? (
              <div className="grid gap-4">
                {[
                  { id: "basic", name: "Basic", price: "$149", disputes: "3 disputes", features: ["3 AI-generated dispute letters", "FCRA-compliant formatting", "Email support"] },
                  { id: "standard", name: "Standard", price: "$299", disputes: "7 disputes", features: ["7 AI-generated dispute letters", "FCRA-compliant formatting", "Priority support", "Progress tracking"] },
                  { id: "premium", name: "Premium", price: "$499", disputes: "15 disputes", features: ["15 AI-generated dispute letters", "FCRA-compliant formatting", "Priority support", "Progress tracking", "Dedicated specialist"] },
                ].map((pkg) => (
                  <label
                    key={pkg.id}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      formData.package === pkg.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="package"
                      value={pkg.id}
                      checked={formData.package === pkg.id}
                      onChange={() => updateField("package", pkg.id)}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <span className="text-lg font-bold text-primary">{pkg.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.disputes} — one-time purchase</p>
                      <ul className="mt-2 space-y-1">
                        {pkg.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {[
                  { id: "basic_monthly", name: "Basic Monthly", price: "$49/mo", disputes: "3 disputes/mo", features: ["3 AI-generated dispute letters / month", "FCRA-compliant formatting", "Email support", "Auto-renewing credits"] },
                  { id: "standard_monthly", name: "Standard Monthly", price: "$99/mo", disputes: "7 disputes/mo", features: ["7 AI-generated dispute letters / month", "FCRA-compliant formatting", "Priority support", "Progress tracking", "Auto-renewing credits"] },
                  { id: "premium_monthly", name: "Premium Monthly", price: "$149/mo", disputes: "15 disputes/mo", features: ["15 AI-generated dispute letters / month", "FCRA-compliant formatting", "Priority support", "Progress tracking", "Dedicated specialist", "Auto-renewing credits"] },
                ].map((pl) => (
                  <label
                    key={pl.id}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      formData.plan === pl.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={pl.id}
                      checked={formData.plan === pl.id}
                      onChange={() => updateField("plan", pl.id)}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{pl.name}</h4>
                        <span className="text-lg font-bold text-primary">{pl.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{pl.disputes} — billed monthly</p>
                      <ul className="mt-2 space-y-1">
                        {pl.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Get Started with ClearCredit</h1>
          <p className="mt-2 text-sm text-muted-foreground">Complete the steps below to activate your account</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      step.id < currentStep
                        ? "bg-success text-white"
                        : step.id === currentStep
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.id < currentStep ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                  </div>
                  <span className={`mt-1 text-xs font-medium ${step.id === currentStep ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-12 sm:w-16 ${
                      step.id < currentStep ? "bg-success" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl shadow-slate-200/50">
          <CardContent className="p-8">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {renderStep()}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={nextStep} isLoading={loading}>
                {currentStep === steps.length ? "Complete Signup" : "Continue"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
