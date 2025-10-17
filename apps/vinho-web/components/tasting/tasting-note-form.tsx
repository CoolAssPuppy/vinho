"use client";

import { useState, useEffect } from "react";
import { Star, MapPin, Wine } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

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
  onSave?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

type TastingStyle = "casual" | "sommelier" | "winemaker" | null;

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
  onSave,
  onDelete,
  onCancel,
}: TastingNoteFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState(initialNotes);
  const [detailedNotes, setDetailedNotes] = useState(initialDetailedNotes);
  const [tastingStyle, setTastingStyle] = useState<TastingStyle>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationName, setLocationName] = useState(initialLocationName || "");
  const [locationAddress, setLocationAddress] = useState(
    initialLocationAddress || "",
  );
  const [locationCity, setLocationCity] = useState(initialLocationCity || "");
  const [locationLat, setLocationLat] = useState<number | null>(
    initialLocationLat || null,
  );
  const [locationLng, setLocationLng] = useState<number | null>(
    initialLocationLng || null,
  );
  const [tastedAt, setTastedAt] = useState(
    initialTastedAt || new Date().toISOString().split("T")[0],
  );

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Fetch user's tasting style preference
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
        setTastingStyle("casual"); // Default to casual
      }
      setIsLoading(false);
    };

    fetchUserProfile();
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
      location_name: locationName || null,
      location_address: locationAddress || null,
      location_city: locationCity || null,
      location_latitude: locationLat,
      location_longitude: locationLng,
    };

    let error = null;

    if (tastingId) {
      // Update existing tasting
      const { error: updateError } = await supabase
        .from("tastings")
        .update(tastingData)
        .eq("id", tastingId);

      error = updateError;
    } else {
      // Create new tasting
      const { error: insertError } = await supabase
        .from("tastings")
        .insert(tastingData);

      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      console.error("Error saving tasting:", error);
      // You might want to show an error message to the user here
      alert("Failed to save tasting. Please try again.");
    } else {
      // Only call onSave if there was no error
      if (onSave) onSave();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const WineImage = () => {
    if (!initialImageUrl) return null;

    return (
      <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
        <Image
          src={initialImageUrl}
          alt="Wine bottle"
          fill
          className="object-cover"
          priority
        />
      </div>
    );
  };

  const StarRating = () => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 ${
              star <= (hoverRating || rating)
                ? "fill-yellow-500 text-yellow-500"
                : "text-gray-300"
            } transition-colors`}
          />
        </button>
      ))}
      <span className="ml-4 text-lg font-medium">
        {rating > 0 ? `${rating} star${rating !== 1 ? "s" : ""}` : "Not rated"}
      </span>
    </div>
  );

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
          <WineImage />
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tasted-at">Tasting Date</Label>
            <Input
              id="tasted-at"
              type="date"
              value={tastedAt}
              onChange={(e) => setTastedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Where did you taste this wine? (optional)
            </Label>
            <PlaceAutocomplete
              value={locationName}
              onChange={setLocationName}
              onSelect={(place) => {
                setLocationName(place.name);
                setLocationAddress(place.address);
                setLocationCity(place.city || "");
                setLocationLat(place.latitude || null);
                setLocationLng(place.longitude || null);
              }}
              placeholder="Restaurant, bar, home, vineyard..."
              types="restaurant,bar,cafe,food"
            />
          </div>

          <div className="flex justify-between">
            {onDelete && tastingId && (
              <Button
                onClick={onDelete}
                disabled={isSaving}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Delete Tasting
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={isSaving}
                  variant="default"
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || rating === 0}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
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
          <WineImage />
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tasted-at-sommelier">Tasting Date</Label>
            <Input
              id="tasted-at-sommelier"
              type="date"
              value={tastedAt}
              onChange={(e) => setTastedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Tasting Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the wine's appearance, aroma, taste, and finish. What did you like or dislike? Would you recommend it?"
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Professional sommeliers often note: color, clarity, aroma
              intensity, flavor profile, tannins, acidity, body, finish, and
              food pairings.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Where did you taste this wine? (optional)
            </Label>
            <PlaceAutocomplete
              value={locationName}
              onChange={setLocationName}
              onSelect={(place) => {
                setLocationName(place.name);
                setLocationAddress(place.address);
                setLocationCity(place.city || "");
                setLocationLat(place.latitude || null);
                setLocationLng(place.longitude || null);
              }}
              placeholder="Restaurant, bar, home, vineyard..."
              types="restaurant,bar,cafe,food"
            />
          </div>

          <div className="flex justify-between">
            {onDelete && tastingId && (
              <Button
                onClick={onDelete}
                disabled={isSaving}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Delete Tasting
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={isSaving}
                  variant="default"
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
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
          <WineImage />
          <Tabs defaultValue="tasting" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasting">Tasting Notes</TabsTrigger>
              <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="tasting" className="space-y-6">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <StarRating />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tasted-at-winemaker">Tasting Date</Label>
                <Input
                  id="tasted-at-winemaker"
                  type="date"
                  value={tastedAt}
                  onChange={(e) => setTastedAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Sensory Evaluation</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Visual: Color, clarity, viscosity&#10;Nose: Primary, secondary, tertiary aromas&#10;Palate: Entry, mid-palate, finish&#10;Structure: Acidity, tannins, alcohol, body&#10;Overall: Balance, complexity, ageability"
                  rows={8}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="detailed-notes">Winemaking Analysis</Label>
                <Textarea
                  id="detailed-notes"
                  value={detailedNotes}
                  onChange={(e) => setDetailedNotes(e.target.value)}
                  placeholder="Vineyard: Terroir, climate, vintage conditions&#10;Viticulture: Farming practices, yield, harvest decisions&#10;Vinification: Fermentation (wild/inoculated, temperature, vessel)&#10;Élevage: Oak regime, lees contact, fining/filtration&#10;Technical: pH, TA, RS, SO2 levels&#10;Faults: VA, brett, oxidation, reduction, TCA"
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Include observations about winemaking techniques, potential
                  faults, and production methods.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Where did you taste this wine? (optional)
              </Label>
              <PlaceAutocomplete
                value={locationName}
                onChange={setLocationName}
                onSelect={(place) => {
                  setLocationName(place.name);
                  setLocationAddress(place.address);
                  setLocationCity(place.city || "");
                  setLocationLat(place.latitude || null);
                  setLocationLng(place.longitude || null);
                }}
                placeholder="Restaurant, bar, home, vineyard..."
                types="restaurant,bar,cafe,food"
              />
            </div>

            <div className="flex justify-between">
              {onDelete && tastingId && (
                <Button
                  onClick={onDelete}
                  disabled={isSaving}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  Delete Tasting
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                {onCancel && (
                  <Button
                    onClick={onCancel}
                    disabled={isSaving}
                    variant="default"
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-black text-white hover:bg-gray-800"
                  size="lg"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
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
          <WineImage />
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>How did you like this wine?</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-all hover:scale-110"
                  type="button"
                >
                  <Star
                    className={`h-10 w-10 ${
                      (hoverRating || rating) >= star
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Tasting Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you think about this wine?"
              rows={4}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Where did you taste this wine? (optional)
            </Label>
            <PlaceAutocomplete
              value={locationName}
              onChange={setLocationName}
              onSelect={(place) => {
                setLocationName(place.name);
                setLocationAddress(place.address);
                setLocationCity(place.city || "");
                setLocationLat(place.latitude || null);
                setLocationLng(place.longitude || null);
              }}
              placeholder="Restaurant, bar, home, vineyard..."
              types="restaurant,bar,cafe,food"
            />
          </div>

          <div className="flex justify-between">
            {onDelete && tastingId && (
              <Button
                onClick={onDelete}
                disabled={isSaving}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Delete Tasting
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={isSaving}
                  variant="default"
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
