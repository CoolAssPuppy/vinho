"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { SocialButtons, type OAuthProvider } from "@/components/auth/SocialButtons";
import { HCaptcha, type HCaptchaRef } from "@/components/auth/HCaptcha";
import { validateEmail, getAuthErrorMessage } from "@/lib/validation/auth";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

function useVerifiedToast(searchParams: ReadonlyURLSearchParams) {
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified! You can now sign in.");
    }
  }, [searchParams]);
}

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<HCaptchaRef>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useVerifiedToast(searchParams);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      const validation = validateEmail(value);
      if (validation.isValid) setEmailError(undefined);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) { setEmailError(emailValidation.error); return; }
    const hasCaptcha = !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    if (hasCaptcha && !captchaToken) { toast.error("Please complete the captcha."); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email, password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      toast.error(getAuthErrorMessage(error));
      setIsLoading(false);
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
    } else {
      toast.success("Welcome back!");
      window.location.href = "/journal";
    }
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
    <AuthPageWrapper title="Sign in" subtitle="Welcome back." showMarketing>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" style={{ color: "rgba(255,255,255,0.8)" }}>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <Input
              id="email" type="email" placeholder="wine@example.com"
              value={email} onChange={(e) => handleEmailChange(e.target.value)}
              style={{ height: "48px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", paddingLeft: "40px" }}
              required autoComplete="email"
            />
          </div>
          {emailError && <p style={{ fontSize: "14px", color: "#f87171" }}>{emailError}</p>}
        </div>

        <div className="space-y-2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
            <Label htmlFor="password" style={{ color: "rgba(255,255,255,0.8)" }}>Password</Label>
            <Link href="/auth/forgot-password" style={{ color: "rgba(255,255,255,0.6)" }}>Forgot?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <Input
              id="password" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ height: "48px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", paddingLeft: "40px" }}
              required autoComplete="current-password"
            />
          </div>
        </div>

        <HCaptcha ref={captchaRef}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(undefined)}
          onError={() => { setCaptchaToken(undefined); toast.error("Captcha error."); }}
          className="py-2"
        />

        <Button type="submit" disabled={isLoading}
          style={{ width: "100%", background: "white", color: "black", fontWeight: 600 }}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
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
        No account?{" "}
        <Link href="/auth/register" style={{ color: "white", textDecoration: "underline" }}>Sign up</Link>
      </p>
    </AuthPageWrapper>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
