"use client";

import { useState, useEffect } from "react";
import { Star, MapPin, Sparkles } from "lucide-react";
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
import { createClient } from "@/lib/supabase";

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

  // Wine editing states
  const [editedWineName, setEditedWineName] = useState(wineName);
  const [editedWineDescription, setEditedWineDescription] = useState(wineDescription || "");
  const [editedProducerName, setEditedProducerName] = useState(producerName);
  const [isEditingWineName, setIsEditingWineName] = useState(false);
  const [isEditingWineDescription, setIsEditingWineDescription] = useState(false);
  const [isEditingProducer, setIsEditingProducer] = useState(false);
  const [isSavingWine, setIsSavingWine] = useState(false);

  // Wine details editing states
  const [editedVarietal, setEditedVarietal] = useState(wineVarietal || "");
  const [editedStyle, setEditedStyle] = useState(wineStyle || "");
  const [editedServingTemp, setEditedServingTemp] = useState(wineServingTemp || "");
  const [currentFoodPairings, setCurrentFoodPairings] = useState<string[]>(wineFoodPairings || []);
  const [currentDescription, setCurrentDescription] = useState(wineDescription || "");
  const [isEditingVarietal, setIsEditingVarietal] = useState(false);
  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [isEditingServingTemp, setIsEditingServingTemp] = useState(false);
  const [isEnrichingWithAI, setIsEnrichingWithAI] = useState(false);

  const supabase = createClient();

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

  const handleSaveWineName = async () => {
    if (!wineId || !editedWineName.trim()) {
      setIsEditingWineName(false);
      return;
    }

    setIsSavingWine(true);

    const { error } = await supabase
      .from("wines")
      .update({ name: editedWineName })
      .eq("id", wineId);

    setIsSavingWine(false);

    if (error) {
      console.error("Error updating wine name:", error);
      alert("Failed to update wine name. Please try again.");
    } else {
      setIsEditingWineName(false);
    }
  };

  const handleSaveWineDescription = async () => {
    if (!wineId) {
      setIsEditingWineDescription(false);
      return;
    }

    setIsSavingWine(true);

    const { error } = await supabase
      .from("wines")
      .update({ tasting_notes: editedWineDescription || null })
      .eq("id", wineId);

    setIsSavingWine(false);

    if (error) {
      console.error("Error updating wine description:", error);
      alert("Failed to update wine description. Please try again.");
    } else {
      setIsEditingWineDescription(false);
    }
  };

  const handleSaveProducer = async () => {
    if (!wineId || !editedProducerName.trim()) {
      setIsEditingProducer(false);
      return;
    }

    setIsSavingWine(true);

    try {
      // First, try to find an existing producer with this name
      const { data: existingProducers } = await supabase
        .from("producers")
        .select("id, name")
        .ilike("name", editedProducerName.trim())
        .limit(1);

      let producerId: string;

      if (existingProducers && existingProducers.length > 0) {
        // Use existing producer
        producerId = existingProducers[0].id;
      } else {
        // Create new producer
        const { data: newProducer, error: createError } = await supabase
          .from("producers")
          .insert({ name: editedProducerName.trim() })
          .select("id")
          .single();

        if (createError || !newProducer) {
          throw new Error("Failed to create producer");
        }
        producerId = newProducer.id;
      }

      // Update the wine to point to this producer
      const { error: updateError } = await supabase
        .from("wines")
        .update({ producer_id: producerId })
        .eq("id", wineId);

      if (updateError) {
        throw updateError;
      }

      setIsEditingProducer(false);
    } catch (error) {
      console.error("Error updating producer:", error);
      alert("Failed to update producer. Please try again.");
    } finally {
      setIsSavingWine(false);
    }
  };

  const handleSaveWineField = async (field: string, value: string) => {
    if (!wineId) return;

    setIsSavingWine(true);
    try {
      const updateData: Record<string, string | null> = {};
      updateData[field] = value.trim() || null;

      const { error } = await supabase
        .from("wines")
        .update(updateData)
        .eq("id", wineId);

      if (error) throw error;

      // Update local state
      switch (field) {
        case "varietal":
          setEditedVarietal(value);
          setIsEditingVarietal(false);
          break;
        case "style":
          setEditedStyle(value);
          setIsEditingStyle(false);
          break;
        case "serving_temperature":
          setEditedServingTemp(value);
          setIsEditingServingTemp(false);
          break;
      }
    } catch (error) {
      console.error(`Error updating wine ${field}:`, error);
      alert(`Failed to update wine ${field}. Please try again.`);
    } finally {
      setIsSavingWine(false);
    }
  };

  const handleEnrichWithAI = async () => {
    if (!wineId) return;

    setIsEnrichingWithAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-wines`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "enrich-single",
            wine_id: wineId,
            vintage_id: vintageId,
            producer: editedProducerName || producerName,
            wine_name: editedWineName || wineName,
            year: wineYear,
            region: wineRegion,
            overwrite: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to enrich wine");
      }

      const result = await response.json();

      if (result.success && result.enrichment) {
        const enrichment = result.enrichment;
        // Update local state with enriched data
        if (enrichment.varietals && enrichment.varietals.length > 0) {
          setEditedVarietal(enrichment.varietals.join(", "));
        }
        if (enrichment.style) {
          setEditedStyle(enrichment.style);
        }
        if (enrichment.serving_temperature) {
          setEditedServingTemp(enrichment.serving_temperature);
        }
        if (enrichment.food_pairings) {
          setCurrentFoodPairings(enrichment.food_pairings);
        }
        if (enrichment.tasting_notes) {
          setCurrentDescription(enrichment.tasting_notes);
          setEditedWineDescription(enrichment.tasting_notes);
        }
      }
    } catch (error) {
      console.error("Error enriching wine with AI:", error);
      alert("Failed to enrich wine with AI. Please try again.");
    } finally {
      setIsEnrichingWithAI(false);
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

  const WineInfo = () => {
    if (!wineId) return null;

    return (
      <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
        {/* Wine Name */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Wine Name</Label>
          {isEditingWineName ? (
            <div className="flex gap-2">
              <Input
                value={editedWineName}
                onChange={(e) => setEditedWineName(e.target.value)}
                className="flex-1"
                placeholder="Wine name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveWineName();
                  } else if (e.key === "Escape") {
                    setIsEditingWineName(false);
                    setEditedWineName(wineName);
                  }
                }}
                autoFocus
                disabled={isSavingWine}
              />
              <Button
                size="sm"
                onClick={handleSaveWineName}
                disabled={isSavingWine || !editedWineName.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingWineName(false);
                  setEditedWineName(wineName);
                }}
                disabled={isSavingWine}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div
              className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setIsEditingWineName(true)}
            >
              <p className="text-lg font-semibold">{wineName || "Tap to add wine name"}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </div>
          )}
        </div>

        {/* Producer */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Producer</Label>
          {isEditingProducer ? (
            <div className="flex gap-2">
              <Input
                value={editedProducerName}
                onChange={(e) => setEditedProducerName(e.target.value)}
                className="flex-1"
                placeholder="Producer name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveProducer();
                  } else if (e.key === "Escape") {
                    setIsEditingProducer(false);
                    setEditedProducerName(producerName);
                  }
                }}
                autoFocus
                disabled={isSavingWine}
              />
              <Button
                size="sm"
                onClick={handleSaveProducer}
                disabled={isSavingWine || !editedProducerName.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingProducer(false);
                  setEditedProducerName(producerName);
                }}
                disabled={isSavingWine}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div
              className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setIsEditingProducer(true)}
            >
              <p className="font-medium text-primary">{producerName || "Tap to add producer"}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </div>
          )}
        </div>

        {/* Wine Description */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Wine Description</Label>
          {isEditingWineDescription ? (
            <div className="space-y-2">
              <Textarea
                value={editedWineDescription}
                onChange={(e) => setEditedWineDescription(e.target.value)}
                className="min-h-[100px]"
                placeholder="Add wine description or tasting notes..."
                disabled={isSavingWine}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveWineDescription}
                  disabled={isSavingWine}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingWineDescription(false);
                    setEditedWineDescription(wineDescription || "");
                  }}
                  disabled={isSavingWine}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="p-2 rounded cursor-pointer hover:bg-muted transition-colors min-h-[60px]"
              onClick={() => setIsEditingWineDescription(true)}
            >
              <p className="text-sm whitespace-pre-wrap">
                {currentDescription || "Tap to add wine description"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </div>
          )}
        </div>

        {/* Wine Details Section */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">Wine Details</h4>
            <Button
              size="sm"
              onClick={handleEnrichWithAI}
              disabled={isEnrichingWithAI || isSavingWine}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {isEnrichingWithAI ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Fill
                </>
              )}
            </Button>
          </div>

          {/* Varietal */}
          <div className="space-y-2 mb-3">
            <Label className="text-xs text-muted-foreground">Varietal</Label>
            {isEditingVarietal ? (
              <div className="flex gap-2">
                <Input
                  value={editedVarietal}
                  onChange={(e) => setEditedVarietal(e.target.value)}
                  className="flex-1"
                  placeholder="e.g., Pinot Noir, Chardonnay"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveWineField("varietal", editedVarietal);
                    } else if (e.key === "Escape") {
                      setIsEditingVarietal(false);
                      setEditedVarietal(wineVarietal || "");
                    }
                  }}
                  autoFocus
                  disabled={isSavingWine}
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveWineField("varietal", editedVarietal)}
                  disabled={isSavingWine}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingVarietal(false);
                    setEditedVarietal(wineVarietal || "");
                  }}
                  disabled={isSavingWine}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsEditingVarietal(true)}
              >
                <p className="text-sm">{editedVarietal || "Tap to add varietal"}</p>
              </div>
            )}
          </div>

          {/* Style */}
          <div className="space-y-2 mb-3">
            <Label className="text-xs text-muted-foreground">Style</Label>
            {isEditingStyle ? (
              <div className="flex gap-2">
                <Input
                  value={editedStyle}
                  onChange={(e) => setEditedStyle(e.target.value)}
                  className="flex-1"
                  placeholder="e.g., Dry, Semi-dry, Sweet"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveWineField("style", editedStyle);
                    } else if (e.key === "Escape") {
                      setIsEditingStyle(false);
                      setEditedStyle(wineStyle || "");
                    }
                  }}
                  autoFocus
                  disabled={isSavingWine}
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveWineField("style", editedStyle)}
                  disabled={isSavingWine}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingStyle(false);
                    setEditedStyle(wineStyle || "");
                  }}
                  disabled={isSavingWine}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsEditingStyle(true)}
              >
                <p className="text-sm">{editedStyle || "Tap to add style"}</p>
              </div>
            )}
          </div>

          {/* Serving Temperature */}
          <div className="space-y-2 mb-3">
            <Label className="text-xs text-muted-foreground">Serving Temperature</Label>
            {isEditingServingTemp ? (
              <div className="flex gap-2">
                <Input
                  value={editedServingTemp}
                  onChange={(e) => setEditedServingTemp(e.target.value)}
                  className="flex-1"
                  placeholder="e.g., 16-18 C"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveWineField("serving_temperature", editedServingTemp);
                    } else if (e.key === "Escape") {
                      setIsEditingServingTemp(false);
                      setEditedServingTemp(wineServingTemp || "");
                    }
                  }}
                  autoFocus
                  disabled={isSavingWine}
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveWineField("serving_temperature", editedServingTemp)}
                  disabled={isSavingWine}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingServingTemp(false);
                    setEditedServingTemp(wineServingTemp || "");
                  }}
                  disabled={isSavingWine}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsEditingServingTemp(true)}
              >
                <p className="text-sm">{editedServingTemp || "Tap to add serving temp"}</p>
              </div>
            )}
          </div>

          {/* Food Pairings (Read-only, populated by AI) */}
          {currentFoodPairings.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Food Pairings</Label>
              <div className="flex flex-wrap gap-2">
                {currentFoodPairings.map((pairing, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                  >
                    {pairing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
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
          <WineInfo />
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
          <WineInfo />
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
          <WineInfo />
          <Tabs defaultValue="tasting" className="space-y-6 mt-6">
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
