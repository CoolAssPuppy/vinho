"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileStatsCards } from "./ProfileStatsCards";

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

interface PersonalInfoTabProps {
  profile: ProfileData;
  stats: ProfileStats;
  onProfileUpdate: (
    firstName: string,
    lastName: string,
    description?: string,
  ) => void;
}

export function PersonalInfoTab({
  profile,
  stats,
  onProfileUpdate,
}: PersonalInfoTabProps) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [description, setDescription] = useState(profile.description || "");

  const handleSaveProfile = () => {
    onProfileUpdate(firstName, lastName, description);
  };

  return (
    <div className="space-y-6">
      <ProfileStatsCards stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription className="text-base">
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-base">
                First Name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="text-base h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-base">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="text-base h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="text-base h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">
              Bio / Description
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about yourself and your wine journey..."
              className="w-full min-h-[120px] px-3 py-2 text-base bg-vino-dark-secondary border border-vino-border rounded-md text-vino-text placeholder:text-vino-text-secondary focus:outline-none focus:ring-2 focus:ring-vino-primary focus:border-transparent resize-y"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} className="text-base px-6 py-2">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
