"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase";

import { StarRating } from "./StarRating";
import { WineImageDisplay } from "./WineImageDisplay";
import { WineInfoEditor } from "./WineInfoEditor";
import { LocationPicker } from "./LocationPicker";
import { TastingFormActions } from "./TastingFormActions";
import { TastingNotesInput } from "./TastingNotesInput";
import { TastingDateInput } from "./TastingDateInput";
import type { TastingStyle, LocationData, WineData } from "./types";

interface TastingNoteFormProps {
  tastingId?: string;
  vintageId: string;
  initialRating?: number;
  initialNotes?: string;
  initialDetailedNotes?: string;
  initialTastedAt?: string;
  initialLocationName?: string;
  initialLocationAddress?: string;
  initialLocationCity?: string;
  initialLocationLat?: number | null;
  initialLocationLng?: number | null;
  initialImageUrl?: string | null;
  wineId?: string;
  wineName?: string;
  wineDescription?: string | null;
  producerName?: string;
  wineVarietal?: string | null;
  wineStyle?: string | null;
  wineServingTemp?: string | null;
  wineFoodPairings?: string[] | null;
  wineRegion?: string | null;
  wineYear?: number | null;
  onSave?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function TastingNoteForm({
  tastingId,
  vintageId,
  initialRating = 0,
  initialNotes = "",
  initialDetailedNotes = "",
  initialTastedAt,
  initialLocationName = "",
  initialLocationAddress = "",
  initialLocationCity = "",
  initialLocationLat = null,
  initialLocationLng = null,
  initialImageUrl = null,
  wineId,
  wineName = "",
  wineDescription = null,
  producerName = "",
  wineVarietal = null,
  wineStyle = null,
  wineServingTemp = null,
  wineFoodPairings = null,
  wineRegion = null,
  wineYear = null,
  onSave,
  onDelete,
  onCancel,
}: TastingNoteFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [notes, setNotes] = useState(initialNotes);
  const [detailedNotes, setDetailedNotes] = useState(initialDetailedNotes);
  const [tastingStyle, setTastingStyle] = useState<TastingStyle>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tastedAt, setTastedAt] = useState(
    initialTastedAt || new Date().toISOString().split("T")[0]
  );

  const [location, setLocation] = useState<LocationData>({
    name: initialLocationName || "",
    address: initialLocationAddress || "",
    city: initialLocationCity || "",
    latitude: initialLocationLat || null,
    longitude: initialLocationLng || null,
  });

  const wineData: WineData = {
    id: wineId,
    name: wineName,
    description: wineDescription,
    producerName,
    varietal: wineVarietal,
    style: wineStyle,
    servingTemp: wineServingTemp,
    foodPairings: wineFoodPairings,
    region: wineRegion,
    year: wineYear,
  };

  const supabase = createClient();

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tasting_note_style")
        .eq("id", user.id)
        .single();

      if (profile?.tasting_note_style) {
        setTastingStyle(profile.tasting_note_style as TastingStyle);
      } else {
        setTastingStyle("casual");
      }
      setIsLoading(false);
    };

    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const tastingData = {
      user_id: user.id,
      vintage_id: vintageId,
      verdict: rating || null,
      notes: notes || null,
      detailed_notes: detailedNotes || null,
      tasted_at: tastedAt,
      location_name: location.name || null,
      location_address: location.address || null,
      location_city: location.city || null,
      location_latitude: location.latitude,
      location_longitude: location.longitude,
    };

    let error = null;

    if (tastingId) {
      const { error: updateError } = await supabase
        .from("tastings")
        .update(tastingData)
        .eq("id", tastingId);

      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("tastings")
        .insert(tastingData);

      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      console.error("Error saving tasting:", error);
      alert("Failed to save tasting. Please try again.");
    } else {
      if (onSave) onSave();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  // Casual style: Just stars
  if (tastingStyle === "casual") {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Rate This Wine</CardTitle>
          <CardDescription>
            Quick and easy - just tap the stars to rate this wine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WineImageDisplay imageUrl={initialImageUrl} />
          <WineInfoEditor wineData={wineData} vintageId={vintageId} />

          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>

          <TastingDateInput tastedAt={tastedAt} onTastedAtChange={setTastedAt} />
          <LocationPicker location={location} onLocationChange={setLocation} />

          <TastingFormActions
            isSaving={isSaving}
            tastingId={tastingId}
            onSave={handleSave}
            onDelete={onDelete}
            onCancel={onCancel}
            saveDisabled={rating === 0}
          />
        </CardContent>
      </Card>
    );
  }

  // Professional Sommelier: Stars + Personal Notes
  if (tastingStyle === "sommelier") {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Wine Tasting Notes</CardTitle>
          <CardDescription>
            Rate and describe this wine in your own words
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WineImageDisplay imageUrl={initialImageUrl} />
          <WineInfoEditor wineData={wineData} vintageId={vintageId} />

          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>

          <TastingDateInput
            tastedAt={tastedAt}
            onTastedAtChange={setTastedAt}
            id="tasted-at-sommelier"
          />

          <TastingNotesInput
            notes={notes}
            onNotesChange={setNotes}
            placeholder="Describe the wine's appearance, aroma, taste, and finish. What did you like or dislike? Would you recommend it?"
            helperText="Professional sommeliers often note: color, clarity, aroma intensity, flavor profile, tannins, acidity, body, finish, and food pairings."
          />

          <LocationPicker location={location} onLocationChange={setLocation} />

          <TastingFormActions
            isSaving={isSaving}
            tastingId={tastingId}
            onSave={handleSave}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    );
  }

  // Professional Winemaker: Stars + Personal Notes + Technical Details
  if (tastingStyle === "winemaker") {
    return (
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Complete Wine Analysis</CardTitle>
          <CardDescription>
            Provide detailed tasting notes and technical winemaking observations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WineImageDisplay imageUrl={initialImageUrl} />
          <WineInfoEditor wineData={wineData} vintageId={vintageId} />

          <Tabs defaultValue="tasting" className="space-y-6 mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasting">Tasting Notes</TabsTrigger>
              <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="tasting" className="space-y-6">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <StarRating rating={rating} onRatingChange={setRating} />
              </div>

              <TastingDateInput
                tastedAt={tastedAt}
                onTastedAtChange={setTastedAt}
                id="tasted-at-winemaker"
              />

              <TastingNotesInput
                notes={notes}
                onNotesChange={setNotes}
                label="Sensory Evaluation"
                placeholder={`Visual: Color, clarity, viscosity\nNose: Primary, secondary, tertiary aromas\nPalate: Entry, mid-palate, finish\nStructure: Acidity, tannins, alcohol, body\nOverall: Balance, complexity, ageability`}
                rows={8}
                monospace
              />
            </TabsContent>

            <TabsContent value="technical" className="space-y-6">
              <TastingNotesInput
                notes={detailedNotes}
                onNotesChange={setDetailedNotes}
                label="Winemaking Analysis"
                id="detailed-notes"
                placeholder={`Vineyard: Terroir, climate, vintage conditions\nViticulture: Farming practices, yield, harvest decisions\nVinification: Fermentation (wild/inoculated, temperature, vessel)\nElevage: Oak regime, lees contact, fining/filtration\nTechnical: pH, TA, RS, SO2 levels\nFaults: VA, brett, oxidation, reduction, TCA`}
                rows={10}
                monospace
                helperText="Include observations about winemaking techniques, potential faults, and production methods."
              />
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <LocationPicker location={location} onLocationChange={setLocation} />

            <TastingFormActions
              isSaving={isSaving}
              tastingId={tastingId}
              onSave={handleSave}
              onDelete={onDelete}
              onCancel={onCancel}
              size="lg"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for null/undefined style - show a simple form
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Tasting Note</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <WineImageDisplay imageUrl={initialImageUrl} />

          <div className="space-y-2">
            <Label>How did you like this wine?</Label>
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              size="large"
            />
          </div>

          <TastingNotesInput
            notes={notes}
            onNotesChange={setNotes}
            rows={4}
          />

          <LocationPicker location={location} onLocationChange={setLocation} />

          <TastingFormActions
            isSaving={isSaving}
            tastingId={tastingId}
            onSave={handleSave}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </div>
      </CardContent>
    </Card>
  );
}
