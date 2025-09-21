"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
  Camera,
  Heart,
  Bookmark,
  Archive,
  User,
  Lock,
  Sliders,
  HelpCircle,
  Mail,
  Star,
  Info,
  FileText,
  ShieldAlert,
  LogOut,
  Settings,
  ChevronRight,
  Wine,
  BookOpen,
  MapPin,
} from "lucide-react";
import { Database } from "@/types/database.types";

interface UserProfile {
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Stats {
  wines: number;
  notes: number;
  regions: number;
  favorites: number;
  wishlist: number;
  cellar: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: "Wine Enthusiast",
    bio: null,
    avatar_url: null,
  });
  const [stats, setStats] = useState<Stats>({
    wines: 0,
    notes: 0,
    regions: 0,
    favorites: 0,
    wishlist: 0,
    cellar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        // Don't redirect - let middleware handle that
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          // Try to get profile from profiles table
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileData) {
            const fullName = [profileData.first_name, profileData.last_name]
              .filter(Boolean)
              .join(" ");
            setProfile({
              full_name: fullName || "Wine Enthusiast",
              bio: null,
              avatar_url: profileData.avatar_url,
            });
          }

          // Load stats
          await loadStats(session.user.id);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function loadStats(userId: string) {
    try {
      // Get tastings count
      const { count: tastingCount } = await supabase
        .from("tastings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get unique wines count
      const { data: wineData } = await supabase
        .from("tastings")
        .select("vintage_id")
        .eq("user_id", userId);

      const uniqueWines = new Set(
        wineData?.map((t) => t.vintage_id).filter(Boolean) || [],
      ).size;

      // Get favorites (ratings >= 4)
      const { count: favoriteCount } = await supabase
        .from("tastings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("verdict", 4);

      setStats({
        wines: uniqueWines,
        notes: tastingCount || 0,
        regions: Math.min(15, Math.max(1, Math.floor(uniqueWines / 8))), // Estimate
        favorites: favoriteCount || 0,
        wishlist: Math.max(0, Math.floor(uniqueWines / 3)), // Mock
        cellar: Math.max(0, Math.floor(uniqueWines / 4)), // Mock
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function updateProfile(fullName: string, bio: string) {
    if (!user) return;

    try {
      // Split full name into first and last
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (!error) {
        setProfile({ ...profile, full_name: fullName, bio });
        setShowEditProfile(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vino-dark flex items-center justify-center">
        <div className="text-vino-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vino-dark">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-vino-primary/20 to-transparent h-[300px]" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-vino-text">Profile</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-vino-dark-secondary transition"
          >
            <Settings className="w-6 h-6 text-vino-accent" />
          </button>
        </div>

        {/* Profile Header */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-vino-accent/30 to-vino-primary/30 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">
                {profile?.full_name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </span>
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-vino-primary to-vino-accent rounded-full shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* User Info */}
          <h2 className="text-2xl font-bold text-vino-text mb-2">
            {profile?.full_name || "Wine Enthusiast"}
          </h2>
          <p className="text-vino-text-secondary text-sm mb-2">{user?.email}</p>
          {profile?.bio && (
            <p className="text-vino-text-secondary max-w-md mx-auto mb-4">
              {profile.bio}
            </p>
          )}

          {/* Edit Profile Button */}
          <button
            onClick={() => setShowEditProfile(true)}
            className="px-6 py-2 border border-vino-accent text-vino-accent rounded-full text-sm font-semibold hover:bg-vino-accent/10 transition"
          >
            Edit Profile
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-px bg-vino-border rounded-2xl overflow-hidden mb-6">
          <StatItem icon={Wine} value={stats.wines} label="Wines" />
          <StatItem icon={BookOpen} value={stats.notes} label="Notes" />
          <StatItem icon={MapPin} value={stats.regions} label="Regions" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <QuickAction
            icon={Heart}
            title="Favorites"
            count={stats.favorites}
            color="text-red-500"
            bgColor="bg-red-500/15"
          />
          <QuickAction
            icon={Bookmark}
            title="Wishlist"
            count={stats.wishlist}
            color="text-vino-accent"
            bgColor="bg-vino-accent/15"
          />
          <QuickAction
            icon={Archive}
            title="Cellar"
            count={stats.cellar}
            color="text-vino-primary"
            bgColor="bg-vino-primary/15"
          />
        </div>

        {/* Menu Sections */}
        <div className="space-y-4 mb-6">
          <MenuSection title="Account">
            <MenuItem icon={User} title="Personal Information" />
            <MenuItem icon={Lock} title="Privacy & Security" />
            <MenuItem icon={Sliders} title="Wine Preferences" />
          </MenuSection>

          <MenuSection title="Support">
            <MenuItem icon={HelpCircle} title="Help Center" />
            <MenuItem icon={Mail} title="Contact Us" />
            <MenuItem icon={Star} title="Rate App" showChevron={false} />
          </MenuSection>

          <MenuSection title="About">
            <MenuItem icon={Info} title="About Vinho" />
            <MenuItem icon={FileText} title="Terms of Service" />
            <MenuItem icon={ShieldAlert} title="Privacy Policy" />
          </MenuSection>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl font-semibold hover:bg-red-500/20 transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onSave={updateProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-vino-dark-secondary py-5 flex flex-col items-center">
      <div className="flex items-center gap-1 mb-2">
        <Icon className="w-4 h-4 text-vino-accent" />
        <span className="text-2xl font-bold text-vino-text">{value}</span>
      </div>
      <span className="text-xs text-vino-text-secondary">{label}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  count,
  color,
  bgColor,
}: {
  icon: any;
  title: string;
  count: number;
  color: string;
  bgColor: string;
}) {
  return (
    <button className="bg-vino-dark-secondary border border-vino-border rounded-2xl p-4 hover:bg-vino-dark-secondary/80 transition">
      <div
        className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-sm text-vino-text mb-1">{title}</p>
      <p className="text-lg font-bold text-vino-text">{count}</p>
    </button>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-vino-text-secondary px-4 mb-2">
        {title}
      </p>
      <div className="bg-vino-dark-secondary rounded-2xl divide-y divide-vino-border">
        {children}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  title,
  showChevron = true,
}: {
  icon: any;
  title: string;
  showChevron?: boolean;
}) {
  return (
    <button className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-vino-dark/50 transition">
      <Icon className="w-5 h-5 text-vino-accent" />
      <span className="flex-1 text-left text-vino-text">{title}</span>
      {showChevron && (
        <ChevronRight className="w-4 h-4 text-vino-text-tertiary" />
      )}
    </button>
  );
}

function EditProfileModal({
  profile,
  onSave,
  onClose,
}: {
  profile: UserProfile | null;
  onSave: (name: string, bio: string) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-vino-dark-secondary rounded-3xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-vino-text mb-6">Edit Profile</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-vino-text-secondary block mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-vino-dark border border-vino-border rounded-xl text-vino-text focus:outline-none focus:border-vino-accent"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="text-sm text-vino-text-secondary block mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 bg-vino-dark border border-vino-border rounded-xl text-vino-text focus:outline-none focus:border-vino-accent resize-none"
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-vino-border text-vino-text rounded-xl hover:bg-vino-dark transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(fullName, bio)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-vino-primary to-vino-accent text-white rounded-xl font-semibold hover:opacity-90 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-vino-dark-secondary rounded-3xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-vino-text mb-6">Settings</h2>

        <div className="space-y-4 mb-6">
          <div className="bg-vino-dark rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-vino-text">App Settings</h3>

            <label className="flex items-center justify-between">
              <span className="text-vino-text">Haptic Feedback</span>
              <input
                type="checkbox"
                checked={hapticEnabled}
                onChange={(e) => setHapticEnabled(e.target.checked)}
                className="w-5 h-5 text-vino-accent"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-vino-text">Sound Effects</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-5 h-5 text-vino-accent"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-vino-text">Push Notifications</span>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-5 h-5 text-vino-accent"
              />
            </label>
          </div>

          <div className="bg-vino-dark rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-vino-text mb-3">
              App Information
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-vino-text-secondary">Version</span>
              <span className="text-vino-text">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-vino-text-secondary">Build</span>
              <span className="text-vino-text">100</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-gradient-to-r from-vino-primary to-vino-accent text-white rounded-xl font-semibold hover:opacity-90 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
