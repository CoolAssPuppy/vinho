import { User, Lock, Wine, HelpCircle, Info, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { PrivacySecurityTab } from "./PrivacySecurityTab";
import { WinePreferencesTab } from "./WinePreferencesTab";
import { HelpCenterTab } from "./HelpCenterTab";
import { AboutTab } from "./AboutTab";
import { VivinoMigration } from "@/app/components/vivino-migration";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  description: string;
}

interface ProfileStats {
  wines: number;
  notes: number;
  regions: number;
  favorites: number;
}

interface ProfileTabsProps {
  profile: ProfileData;
  stats: ProfileStats;
  onProfileUpdate: (
    firstName: string,
    lastName: string,
    description?: string,
  ) => void;
}

export function ProfileTabs({
  profile,
  stats,
  onProfileUpdate,
}: ProfileTabsProps) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <TabsList className="flex flex-col h-auto w-full bg-vino-dark-secondary p-2">
            <TabsTrigger
              value="personal"
              className="w-full justify-start text-base py-3"
            >
              <User className="mr-2 h-5 w-5" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="w-full justify-start text-base py-3"
            >
              <Lock className="mr-2 h-5 w-5" />
              Privacy & Security
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="w-full justify-start text-base py-3"
            >
              <Wine className="mr-2 h-5 w-5" />
              Wine Preferences
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="w-full justify-start text-base py-3"
            >
              <Upload className="mr-2 h-5 w-5" />
              Import from Vivino
            </TabsTrigger>
            <TabsTrigger
              value="help"
              className="w-full justify-start text-base py-3"
            >
              <HelpCircle className="mr-2 h-5 w-5" />
              Help Center
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="w-full justify-start text-base py-3"
            >
              <Info className="mr-2 h-5 w-5" />
              About
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="col-span-3">
          <TabsContent value="personal">
            <PersonalInfoTab
              profile={profile}
              stats={stats}
              onProfileUpdate={onProfileUpdate}
            />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacySecurityTab />
          </TabsContent>

          <TabsContent value="preferences">
            <WinePreferencesTab />
          </TabsContent>

          <TabsContent value="import">
            <VivinoMigration />
          </TabsContent>

          <TabsContent value="help">
            <HelpCenterTab />
          </TabsContent>

          <TabsContent value="about">
            <AboutTab />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
