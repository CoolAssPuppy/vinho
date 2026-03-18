"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { validateEmail, getAuthErrorMessage } from "@/lib/validation/auth";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

const inputStyle = {
  height: "48px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  paddingLeft: "40px",
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) { const v = validateEmail(value); if (v.isValid) setEmailError(undefined); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = validateEmail(email);
    if (!ev.isValid) { setEmailError(ev.error); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) toast.error(getAuthErrorMessage(error));
      else setSuccess(true);
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  if (success) {
    return (
      <AuthPageWrapper title="Check your email">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <CheckCircle style={{ width: "48px", height: "48px", color: "#4ade80", margin: "0 auto" }} />
        </div>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "24px" }}>
          If an account exists for {email}, you&apos;ll get a reset link. Check spam if needed.
        </p>
        <Button onClick={() => setSuccess(false)}
          style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
          Try another email
        </Button>
        <Link href="/auth/login" style={{ display: "block", textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "16px" }}>
          Back to sign in
        </Link>
      </AuthPageWrapper>
    );
  }

  return (
    <AuthPageWrapper title="Reset password" subtitle="We'll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" style={{ color: "rgba(255,255,255,0.8)" }}>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <Input id="email" type="email" placeholder="wine@example.com" value={email}
              onChange={(e) => handleEmailChange(e.target.value)} style={inputStyle} required autoComplete="email" />
          </div>
          {emailError && <p style={{ fontSize: "14px", color: "#f87171" }}>{emailError}</p>}
        </div>
        <Button type="submit" disabled={isLoading}
          style={{ width: "100%", background: "white", color: "black", fontWeight: 600 }}>
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <Link href="/auth/login" style={{ display: "block", textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "24px" }}>
        <ArrowLeft style={{ display: "inline", width: "14px", height: "14px", marginRight: "6px", verticalAlign: "middle" }} />
        Back to sign in
      </Link>
    </AuthPageWrapper>
  );
}
