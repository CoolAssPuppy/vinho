"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Sparkles, Mail, Lock, Wine } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { SocialButtons, type OAuthProvider } from "@/components/auth/SocialButtons";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified! You can now sign in.");
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
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
      <div className="pointer-events-none absolute -left-10 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-6 bottom-0 h-64 w-64 rounded-full bg-vino-accent/25 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/3 top-10 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

      <div className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-4xl overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 md:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.08),transparent_30%)]" />
              <div className="relative z-10 flex flex-col gap-6 text-white">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-vino-accent" />
                  Curated wine rituals
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-3xl font-bold leading-tight sm:text-4xl">
                    Welcome back to your cellar
                  </CardTitle>
                  <CardDescription className="text-base text-white/80">
                    Slide into tasting notes, scan new bottles, and pick up your learning path
                    exactly where you left off. Your palate progress is ready when you are.
                  </CardDescription>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    "Supersonic bottle scanning",
                    "Trusted by sommeliers",
                    "Private by default",
                    "Personalized pairings",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 text-sm text-white/80 shadow-inner shadow-black/20"
                    >
                      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-vino-accent" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Wine className="h-6 w-6 text-vino-accent" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Vinho</p>
                    <p className="text-xs text-white/70">
                      Crafted for thoughtful sippers — on iOS and the web.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-black/40 p-8 md:p-10">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <CardHeader className="space-y-3 px-0 pt-2 pb-1">
                <CardTitle className="text-2xl">Sign in</CardTitle>
                <CardDescription className="text-base text-white/70">
                  Enter your credentials or glide in with a tap.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-0">
                <form onSubmit={handleSignIn} className="space-y-4">
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
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Label htmlFor="password" className="text-white/80">
                        Password
                      </Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-white/60 transition hover:text-vino-accent"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full justify-center bg-gradient-to-r from-vino-primary to-vino-accent text-base shadow-lg shadow-vino-primary/30"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Prefer single-tap access?</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                      Social
                    </span>
                  </div>
                  <SocialButtons onSelect={handleOAuth} disabled={isLoading} />
                  <p className="text-center text-xs text-white/60">
                    We request the bare minimum: your name and email so your cellar stays synced.
                  </p>
                </div>

                <div className="text-center text-sm text-white/70">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-vino-accent hover:underline">
                    Sign up
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}> 
      <LoginForm />
    </Suspense>
  );
}
