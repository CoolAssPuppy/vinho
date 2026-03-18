"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { SocialButtons, type OAuthProvider } from "@/components/auth/SocialButtons";
import { HCaptcha, type HCaptchaRef } from "@/components/auth/HCaptcha";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  validateEmail, validatePassword, validatePasswordMatch,
  validateRequired, getAuthErrorMessage,
} from "@/lib/validation/auth";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

const inputStyle = {
  height: "48px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  paddingLeft: "40px",
};
const labelStyle = { color: "rgba(255,255,255,0.8)" };
const iconStyle = { color: "rgba(255,255,255,0.5)" };

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmError, setConfirmError] = useState<string>();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [isLegalAge, setIsLegalAge] = useState(false);
  const captchaRef = useRef<HCaptchaRef>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) { const v = validateEmail(value); if (v.isValid) setEmailError(undefined); }
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordErrors.length > 0) { const v = validatePassword(value); if (v.isValid) setPasswordErrors([]); }
    if (confirmPassword && value !== confirmPassword) setConfirmError("Passwords do not match");
    else if (confirmPassword) setConfirmError(undefined);
  };
  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    setConfirmError(validatePasswordMatch(password, value).error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fv = validateRequired(firstName, "First name");
    const lv = validateRequired(lastName, "Last name");
    const ev = validateEmail(email);
    const pv = validatePassword(password);
    const mv = validatePasswordMatch(password, confirmPassword);
    if (!fv.isValid) { toast.error(fv.error); return; }
    if (!lv.isValid) { toast.error(lv.error); return; }
    if (!ev.isValid) { setEmailError(ev.error); return; }
    if (!pv.isValid) { setPasswordErrors(pv.errors); return; }
    if (!mv.isValid) { setConfirmError(mv.error); return; }
    const hasCaptcha = !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    if (hasCaptcha && !captchaToken) { toast.error("Please complete the captcha."); return; }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        captchaToken: captchaToken || undefined,
      },
    });
    if (error) {
      toast.error(getAuthErrorMessage(error));
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
    } else {
      toast.success("Check your email to confirm your account");
      router.push("/auth/verify-email");
    }
    setIsLoading(false);
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === "apple" ? "name email" : "email profile",
      },
    });
    if (error) { toast.error(error.message); setIsLoading(false); }
  };

  return (
    <AuthPageWrapper title="Create account" subtitle="Free. Takes 30 seconds." showMarketing>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="space-y-2">
            <Label htmlFor="first-name" style={labelStyle}>First name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4" style={iconStyle} />
              <Input id="first-name" type="text" placeholder="First" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} style={inputStyle} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name" style={labelStyle}>Last name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4" style={iconStyle} />
              <Input id="last-name" type="text" placeholder="Last" value={lastName}
                onChange={(e) => setLastName(e.target.value)} style={inputStyle} required />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" style={labelStyle}>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4" style={iconStyle} />
            <Input id="email" type="email" placeholder="wine@example.com" value={email}
              onChange={(e) => handleEmailChange(e.target.value)} style={inputStyle} required />
          </div>
          {emailError && <p style={{ fontSize: "14px", color: "#f87171" }}>{emailError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" style={labelStyle}>Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4" style={iconStyle} />
            <Input id="password" type="password" placeholder="At least 8 characters" value={password}
              onChange={(e) => handlePasswordChange(e.target.value)} style={inputStyle} required minLength={8} />
          </div>
          <PasswordStrengthIndicator password={password} />
          {passwordErrors.length > 0 && (
            <ul style={{ fontSize: "14px", color: "#f87171" }}>
              {passwordErrors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" style={labelStyle}>Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4" style={iconStyle} />
            <Input id="confirm-password" type="password" placeholder="Confirm" value={confirmPassword}
              onChange={(e) => handleConfirmChange(e.target.value)} style={inputStyle} required minLength={8} />
          </div>
          {confirmError && <p style={{ fontSize: "14px", color: "#f87171" }}>{confirmError}</p>}
        </div>

        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
          By signing up you agree to our{" "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link> and{" "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>

        <HCaptcha ref={captchaRef}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(undefined)}
          onError={() => { setCaptchaToken(undefined); toast.error("Captcha error."); }}
          className="py-2" />

        <Button type="submit" disabled={isLoading || !isLegalAge}
          style={{ width: "100%", background: isLegalAge ? "white" : "rgba(255,255,255,0.2)", color: isLegalAge ? "black" : "rgba(255,255,255,0.4)", fontWeight: 600, cursor: isLegalAge ? "pointer" : "not-allowed" }}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>

        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
          <input
            type="checkbox"
            checked={isLegalAge}
            onChange={(e) => setIsLegalAge(e.target.checked)}
            style={{ width: "16px", height: "16px", accentColor: "white", cursor: "pointer" }}
          />
          I certify that I am of legal drinking age
        </label>
      </form>

      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>or</span>
          <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>
        <SocialButtons onSelect={handleOAuth} disabled={isLoading} />
      </div>

      <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "24px" }}>
        Have an account?{" "}
        <Link href="/auth/login" style={{ color: "white", textDecoration: "underline" }}>Sign in</Link>
      </p>
    </AuthPageWrapper>
  );
}
