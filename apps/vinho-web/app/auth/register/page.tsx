"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Lock, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { SocialButtons, type OAuthProvider } from "@/components/auth/SocialButtons";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });

    if (error) {
      toast.error(error.message);
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
        scopes:
          provider === "apple"
            ? "name email"
            : provider === "facebook"
              ? "public_profile email"
              : "email profile",
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f0b1f] via-[#0b0a17] to-[#120f2f] text-white">
      <div className="pointer-events-none absolute -left-12 top-10 h-72 w-72 rounded-full bg-vino-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-8 h-64 w-64 rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/4 top-20 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

      <div className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-4xl overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-vino-accent/20 via-vino-primary/10 to-transparent p-8 md:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.08),transparent_30%)]" />
              <div className="relative z-10 flex flex-col gap-6 text-white">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  Start your tasting story
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-3xl font-bold leading-tight sm:text-4xl">
                    Create your account
                  </CardTitle>
                  <CardDescription className="text-base text-white/80">
                    Securely capture every bottle you taste. Keep your palate history synced across
                    iOS and the web with a single, beautiful sign-in.
                  </CardDescription>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 shadow-inner shadow-black/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Privacy first</p>
                      <p className="text-xs text-white/70">
                        We only ask for your name and email to set up your cellar.
                      </p>
                    </div>
                  </div>
                  <p className="leading-relaxed">
                    Enable Sign in with Apple, Google, or Facebook for one-tap access. You can delete
                    your account anytime from the Profile tab.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative bg-black/40 p-8 md:p-10">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <CardHeader className="space-y-3 px-0 pt-2 pb-1">
                <CardTitle className="text-2xl">Start for free</CardTitle>
                <CardDescription className="text-base text-white/70">
                  Create your account in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-white/80">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                        <Input
                          id="first-name"
                          type="text"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-white/80">
                        Last Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                        <Input
                          id="last-name"
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="wine@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white/80">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-white/80">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-white/70">
                    By creating an account, you agree to our {" "}
                    <Link href="/terms" className="underline hover:text-vino-accent">
                      Terms of Service
                    </Link>{" "}
                    and {" "}
                    <Link href="/privacy" className="underline hover:text-vino-accent">
                      Privacy Policy
                    </Link>
                    .
                  </div>

                  <Button
                    type="submit"
                    className="w-full justify-center bg-gradient-to-r from-vino-primary to-vino-accent text-base shadow-lg shadow-vino-primary/30"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Prefer one-tap access?</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                      Social
                    </span>
                  </div>
                  <SocialButtons onSelect={handleOAuth} disabled={isLoading} />
                  <p className="text-center text-xs text-white/60">
                    Social sign up uses only your name and email, keeping permissions minimal.
                  </p>
                </div>

                <div className="text-center text-sm text-white/70">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-vino-accent hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
