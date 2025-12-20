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
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { validatePassword, validatePasswordMatch, getAuthErrorMessage } from "@/lib/validation/auth";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

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
    if (passwordErrors.length > 0) {
      const validation = validatePassword(value);
      if (validation.isValid) {
        setPasswordErrors([]);
      }
    }
    // Re-validate confirm password match
    if (confirmPassword && value !== confirmPassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError(undefined);
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    const matchValidation = validatePasswordMatch(password, value);
    setConfirmError(matchValidation.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      return;
    }

    // Validate password match
    const matchValidation = validatePasswordMatch(password, confirmPassword);
    if (!matchValidation.isValid) {
      setConfirmError(matchValidation.error);
      return;
    }

    setIsLoading(true);
    setPasswordErrors([]);
    setConfirmError(undefined);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.includes("should be different")) {
          toast.error("New password must be different from your current password.");
        } else {
          toast.error(getAuthErrorMessage(error));
        }
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        // Redirect to journal after a brief delay
        setTimeout(() => {
          router.push("/journal");
        }, 2000);
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
                <CardTitle className="text-2xl">Password updated</CardTitle>
                <CardDescription className="text-base text-white/70">
                  Your password has been successfully updated. Redirecting you
                  to your journal...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/journal" className="w-full">
                  <Button className="w-full justify-center bg-gradient-to-r from-vino-primary to-vino-accent text-base shadow-lg shadow-vino-primary/30">
                    Go to Journal
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl">Create new password</CardTitle>
                <CardDescription className="text-base text-white/70">
                  Choose a strong password with at least 8 characters, including
                  uppercase, lowercase, and a number.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80">
                      New password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <PasswordStrengthIndicator password={password} />
                    {passwordErrors.length > 0 && (
                      <ul className="text-sm text-red-400">
                        {passwordErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-white/80">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => handleConfirmChange(e.target.value)}
                        className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmError && (
                      <p className="text-sm text-red-400">{confirmError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full justify-center bg-gradient-to-r from-vino-primary to-vino-accent text-base shadow-lg shadow-vino-primary/30"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update password"}
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
