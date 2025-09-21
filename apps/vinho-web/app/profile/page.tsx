"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  User as UserIcon,
  Settings,
  Wine,
  Heart,
  Bell,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { WineQuiz } from "@/components/wine-quiz";
import { WinePreferences } from "@/components/wine-preferences";
import type { Database } from "@/types/database";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<
    Database["public"]["Tables"]["profiles"]["Row"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNewsletter: true,
    pushNotifications: false,
    aiRecommendations: true,
  });

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/");
          return;
        }

        setUser(user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [supabase, router]);

  const handleEmailChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);

    const formData = new FormData(e.currentTarget);
    const newEmail = formData.get("email") as string;

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast.success("Verification email sent to your new address");
    } catch (error) {
      toast.error("Failed to update email");
      console.error("Error updating email:", error);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      e.currentTarget.reset();
    } catch (error) {
      toast.error("Failed to update password");
      console.error("Error updating password:", error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    toast.success("Preferences updated");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Wine className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and wine preferences
          </p>
        </div>

        {!showQuiz ? (
          <>
            {!profile?.wine_preferences && (
              <Card className="mb-6 bg-accent/20 border-accent/30">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Complete Your Wine Profile
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Take a quick quiz to help us recommend wines you'll love
                      </p>
                      <Button
                        onClick={() => setShowQuiz(true)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Start Wine Quiz
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="information" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="information">Information</TabsTrigger>
                <TabsTrigger value="preferences">Favorite Wines</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="information" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Update your email address and password
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium mb-2">Name</Label>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm">
                          {profile?.first_name || "Not set"}{" "}
                          {profile?.last_name || ""}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <form onSubmit={handleEmailChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder={user?.email || ""}
                          className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll send a verification email to your new address
                        </p>
                      </div>
                      <Button type="submit" disabled={emailLoading}>
                        {emailLoading ? "Updating..." : "Update Email"}
                      </Button>
                    </form>

                    <Separator />

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          className="max-w-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          className="max-w-md"
                        />
                      </div>
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Passkey</Label>
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Passwordless authentication with your device
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <WinePreferences profile={profile} userId={user?.id || ""} />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to hear from us
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label
                            htmlFor="email-newsletter"
                            className="text-base"
                          >
                            Email Newsletter
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Weekly wine recommendations and education
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="email-newsletter"
                        checked={preferences.emailNewsletter}
                        onCheckedChange={() =>
                          handlePreferenceChange("emailNewsletter")
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label
                            htmlFor="push-notifications"
                            className="text-base"
                          >
                            Push Notifications
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified about new wines and tastings
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={preferences.pushNotifications}
                        onCheckedChange={() =>
                          handlePreferenceChange("pushNotifications")
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Preferences</CardTitle>
                    <CardDescription>
                      Control how AI enhances your wine journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label
                            htmlFor="ai-recommendations"
                            className="text-base"
                          >
                            AI Recommendations
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Use AI to personalize wine suggestions
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="ai-recommendations"
                        checked={preferences.aiRecommendations}
                        onCheckedChange={() =>
                          handlePreferenceChange("aiRecommendations")
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <WineQuiz
            userId={user?.id || ""}
            onComplete={() => {
              setShowQuiz(false);
              router.refresh();
            }}
            onCancel={() => setShowQuiz(false)}
          />
        )}
      </div>
    </div>
  );
}
