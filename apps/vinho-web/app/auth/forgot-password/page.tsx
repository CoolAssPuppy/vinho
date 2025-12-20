"use client";

import { useState } from "react";
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
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { validateEmail, getAuthErrorMessage } from "@/lib/validation/auth";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      const validation = validateEmail(value);
      if (validation.isValid) {
        setEmailError(undefined);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      return;
    }

    setIsLoading(true);
    setEmailError(undefined);

    try {
      const redirectUrl = `${window.location.origin}/auth/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        setSuccess(true);
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f0b1f] via-[#0b0a17] to-[#120f2f] text-white">
      <div className="pointer-events-none absolute -left-10 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-6 bottom-0 h-64 w-64 rounded-full bg-vino-accent/25 blur-[120px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          {success ? (
            <>
              <CardHeader className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <CardDescription className="text-base text-white/70">
                  If an account exists for {email}, you will receive a password
                  reset link shortly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-white/60">
                  Did not receive an email? Check your spam folder or make sure
                  you entered the correct email address.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setSuccess(false)}
                  >
                    Try another email
                  </Button>
                  <Link href="/auth/login" className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full text-white/70 hover:text-white"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl">Reset your password</CardTitle>
                <CardDescription className="text-base text-white/70">
                  Enter your email address and we will send you a link to reset
                  your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                        required
                        autoComplete="email"
                      />
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-400">{emailError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full justify-center bg-gradient-to-r from-vino-primary to-vino-accent text-base shadow-lg shadow-vino-primary/30"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center text-sm text-white/70 transition hover:text-vino-accent"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
