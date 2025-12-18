"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, Key, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export function PrivacySecurityTab() {
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account and all tastings, scans, and preferences? This cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast.error("Unable to verify your session. Please sign in again.");
      setIsDeleting(false);
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (response.ok) {
      toast.success("Account deleted. We hope to see you again.");
      await supabase.auth.signOut();
      router.push("/auth/login?deleted=true");
    } else {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Unable to delete your account right now.");
    }

    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Security Settings</CardTitle>
          <CardDescription className="text-base">
            Manage your security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-vino-accent" />
              <div>
                <p className="font-medium text-base">
                  Biometric Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  Use Face ID or Touch ID
                </p>
              </div>
            </div>
            <Switch
              checked={biometricsEnabled}
              onCheckedChange={setBiometricsEnabled}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-vino-accent" />
              <div>
                <p className="font-medium text-base">Auto-Lock</p>
                <p className="text-sm text-muted-foreground">
                  Lock app when in background
                </p>
              </div>
            </div>
            <Switch checked={autoLock} onCheckedChange={setAutoLock} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-vino-accent" />
              <div>
                <p className="font-medium text-base">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  Extra security for your account
                </p>
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Privacy</CardTitle>
          <CardDescription className="text-base">
            Control your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full text-base py-2.5">
            <Download className="mr-2 h-5 w-5" />
            Download My Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive text-xl">
            Danger Zone
          </CardTitle>
          <CardDescription className="text-base">
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Remove your profile, tastings, scans, sharing connections, and preferences from
              Vinho. This cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="w-full text-base py-2.5"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
