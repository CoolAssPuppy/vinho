"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Camera } from "lucide-react";
import type { Database } from "@/types/database";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

interface UserProfile {
  full_name: string | null;
  description: string | null;
  avatar_url: string | null;
}

interface Stats {
  wines: number;
  notes: number;
  regions: number;
  favorites: number;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: "Wine Enthusiast",
    description: null,
    avatar_url: null,
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [stats, setStats] = useState<Stats>({
    wines: 0,
    notes: 0,
    regions: 0,
    favorites: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        // Use the unified user_wine_stats view - it automatically filters by auth.uid()
        const { data, error } = await supabase
          .from("user_wine_stats")
          .select("unique_wines, total_tastings, favorites, unique_regions")
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching stats:", error);
        }

        if (mounted) {
          if (data) {
            setStats({
              wines: data.unique_wines || 0,
              notes: data.total_tastings || 0,
              regions: data.unique_regions || 0,
              favorites: data.favorites || 0,
            });
          } else {
            // User has no tastings yet
            setStats({
              wines: 0,
              notes: 0,
              regions: 0,
              favorites: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);

          // Try to get profile from profiles table
          const { data: profileData, error: profileError } = (await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url, description")
            .eq("id", session.user.id)
            .maybeSingle()) as {
            data: {
              first_name: string | null;
              last_name: string | null;
              avatar_url: string | null;
              description: string | null;
            } | null;
            error: any;
          };

          if (!mounted) return;

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching profile:", profileError);
          }

          if (profileData && !profileError) {
            const { first_name, last_name, avatar_url, description } =
              profileData;
            const fullName = [first_name, last_name].filter(Boolean).join(" ");

            console.log("Profile data found:", {
              first_name,
              last_name,
              fullName,
              avatar_url,
              description,
            });

            setProfile({
              full_name: fullName || "Wine Enthusiast",
              description: description || null,
              avatar_url: avatar_url || null,
            });
          } else {
            console.log("No profile data found for user:", session.user.id);
            // No profile exists yet, create one
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
              });

            if (insertError && insertError.code !== "23505") {
              // Ignore duplicate key errors
              console.error("Error creating profile:", insertError);
            }

            // Set defaults if no profile exists
            setProfile({
              full_name: "Wine Enthusiast",
              description: null,
              avatar_url: null,
            });
          }

          // Load stats
          if (mounted) {
            await loadStats();
          }
        } else {
          // Don't redirect here - let the middleware handle it
          // Just set loading to false to avoid infinite loading
          if (!mounted) return;
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function updateProfile(
    firstName: string,
    lastName: string,
    description?: string,
  ) {
    if (!user) return;

    try {
      const updateResponse = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
          ...(description !== undefined && { description }),
        })
        .eq("id", user.id);

      if (!updateResponse.error) {
        const fullName = `${firstName} ${lastName}`.trim();
        setProfile({
          ...profile,
          full_name: fullName,
          description:
            description !== undefined ? description : profile.description,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    setIsUploadingAvatar(true);

    try {
      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: data.publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vino-dark flex items-center justify-center">
        <div className="text-vino-text-secondary">Loading...</div>
      </div>
    );
  }

  const nameParts = (profile?.full_name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="min-h-screen bg-vino-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header - Left aligned */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar with upload */}
            <div className="relative group">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-28 h-28 rounded-full object-cover border-2 border-vino-primary/30"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-vino-accent/30 to-vino-primary/30 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white">
                    {profile?.full_name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-vino-primary to-vino-accent rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
                {isUploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-vino-text mb-2">
                {profile?.full_name || "Wine Enthusiast"}
              </h1>
              <p className="text-base text-vino-text-secondary mb-3">
                {user?.email}
              </p>
              {profile?.description && (
                <p className="text-base text-vino-text/80 max-w-2xl">
                  {profile.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <ProfileTabs
          profile={{
            firstName,
            lastName,
            email: user?.email || "",
            description: profile?.description || "",
          }}
          stats={stats}
          onProfileUpdate={updateProfile}
        />
      </div>
    </div>
  );
}
