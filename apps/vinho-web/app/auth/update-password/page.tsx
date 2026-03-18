"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { validatePassword, validatePasswordMatch, getAuthErrorMessage } from "@/lib/validation/auth";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

const inputStyle = {
  height: "48px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  paddingLeft: "40px",
};

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmError, setConfirmError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordErrors.length > 0) { const v = validatePassword(value); if (v.isValid) setPasswordErrors([]); }
    if (confirmPassword && value !== confirmPassword) setConfirmError("Passwords do not match");
    else setConfirmError(undefined);
  };
  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    setConfirmError(validatePasswordMatch(password, value).error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = validatePassword(password);
    const mv = validatePasswordMatch(password, confirmPassword);
    if (!pv.isValid) { setPasswordErrors(pv.errors); return; }
    if (!mv.isValid) { setConfirmError(mv.error); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.message.includes("should be different")) toast.error("New password must be different from your current one.");
        else toast.error(getAuthErrorMessage(error));
      } else {
        setSuccess(true);
        toast.success("Password updated!");
        setTimeout(() => router.push("/journal"), 2000);
      }
    } catch { toast.error("Something went wrong."); }
    finally { setIsLoading(false); }
  };

  if (success) {
    return (
      <AuthPageWrapper title="Password updated">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <CheckCircle style={{ width: "48px", height: "48px", color: "#4ade80", margin: "0 auto" }} />
        </div>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "24px" }}>
          Redirecting to your journal...
        </p>
        <Link href="/journal">
          <Button style={{ width: "100%", background: "white", color: "black", fontWeight: 600 }}>
            Go to journal
          </Button>
        </Link>
      </AuthPageWrapper>
    );
  }

  return (
    <AuthPageWrapper title="New password" subtitle="At least 8 characters with uppercase, lowercase, and a number.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" style={{ color: "rgba(255,255,255,0.8)" }}>New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <Input id="password" type="password" placeholder="New password" value={password}
              onChange={(e) => handlePasswordChange(e.target.value)} style={inputStyle} required autoComplete="new-password" />
          </div>
          <PasswordStrengthIndicator password={password} />
          {passwordErrors.length > 0 && (
            <ul style={{ fontSize: "14px", color: "#f87171" }}>{passwordErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" style={{ color: "rgba(255,255,255,0.8)" }}>Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <Input id="confirm-password" type="password" placeholder="Confirm" value={confirmPassword}
              onChange={(e) => handleConfirmChange(e.target.value)} style={inputStyle} required autoComplete="new-password" />
          </div>
          {confirmError && <p style={{ fontSize: "14px", color: "#f87171" }}>{confirmError}</p>}
        </div>
        <Button type="submit" disabled={isLoading}
          style={{ width: "100%", background: "white", color: "black", fontWeight: 600 }}>
          {isLoading ? "Updating..." : "Update password"}
        </Button>
      </form>
      <Link href="/auth/login" style={{ display: "block", textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "24px" }}>
        <ArrowLeft style={{ display: "inline", width: "14px", height: "14px", marginRight: "6px", verticalAlign: "middle" }} />
        Back to sign in
      </Link>
    </AuthPageWrapper>
  );
}
