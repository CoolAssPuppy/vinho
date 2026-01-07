"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase";
import { EditableField } from "./EditableField";
import type { WineData } from "./types";

interface WineDetailsEditorProps {
  wineData: WineData;
  vintageId: string;
  currentDescription: string;
  editedProducerName: string;
  editedWineName: string;
  onDescriptionChange?: (description: string) => void;
}

export function WineDetailsEditor({
  wineData,
  vintageId,
  currentDescription,
  editedProducerName,
  editedWineName,
  onDescriptionChange,
}: WineDetailsEditorProps) {
  const supabase = createClient();

  const [editedVarietal, setEditedVarietal] = useState(wineData.varietal || "");
  const [isEditingVarietal, setIsEditingVarietal] = useState(false);
  const [editedStyle, setEditedStyle] = useState(wineData.style || "");
  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [editedServingTemp, setEditedServingTemp] = useState(wineData.servingTemp || "");
  const [isEditingServingTemp, setIsEditingServingTemp] = useState(false);
  const [currentFoodPairings, setCurrentFoodPairings] = useState<string[]>(
    wineData.foodPairings || []
  );

  const [isSavingWine, setIsSavingWine] = useState(false);
  const [isEnrichingWithAI, setIsEnrichingWithAI] = useState(false);

  const handleSaveWineField = async (field: string, value: string) => {
    if (!wineData.id) return;

    setIsSavingWine(true);
    try {
      const updateData: Record<string, string | null> = {};
      updateData[field] = value.trim() || null;

      const { error } = await supabase
        .from("wines")
        .update(updateData)
        .eq("id", wineData.id);

      if (error) throw error;

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
    if (!wineData.id) return;

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
            wine_id: wineData.id,
            vintage_id: vintageId,
            producer: editedProducerName || wineData.producerName,
            wine_name: editedWineName || wineData.name,
            year: wineData.year,
            region: wineData.region,
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
          onDescriptionChange?.(enrichment.tasting_notes);
        }
      }
    } catch (error) {
      console.error("Error enriching wine with AI:", error);
      alert("Failed to enrich wine with AI. Please try again.");
    } finally {
      setIsEnrichingWithAI(false);
    }
  };

  return (
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
      <div className="mb-3">
        <EditableField
          label="Varietal"
          value={editedVarietal}
          editedValue={editedVarietal}
          onEditedValueChange={setEditedVarietal}
          isEditing={isEditingVarietal}
          onStartEditing={() => setIsEditingVarietal(true)}
          onSave={() => handleSaveWineField("varietal", editedVarietal)}
          onCancel={() => {
            setIsEditingVarietal(false);
            setEditedVarietal(wineData.varietal || "");
          }}
          isSaving={isSavingWine}
          placeholder="e.g., Pinot Noir, Chardonnay"
          emptyText="Tap to add varietal"
          showClickToEdit={false}
        />
      </div>

      {/* Style */}
      <div className="mb-3">
        <EditableField
          label="Style"
          value={editedStyle}
          editedValue={editedStyle}
          onEditedValueChange={setEditedStyle}
          isEditing={isEditingStyle}
          onStartEditing={() => setIsEditingStyle(true)}
          onSave={() => handleSaveWineField("style", editedStyle)}
          onCancel={() => {
            setIsEditingStyle(false);
            setEditedStyle(wineData.style || "");
          }}
          isSaving={isSavingWine}
          placeholder="e.g., Dry, Semi-dry, Sweet"
          emptyText="Tap to add style"
          showClickToEdit={false}
        />
      </div>

      {/* Serving Temperature */}
      <div className="mb-3">
        <EditableField
          label="Serving Temperature"
          value={editedServingTemp}
          editedValue={editedServingTemp}
          onEditedValueChange={setEditedServingTemp}
          isEditing={isEditingServingTemp}
          onStartEditing={() => setIsEditingServingTemp(true)}
          onSave={() => handleSaveWineField("serving_temperature", editedServingTemp)}
          onCancel={() => {
            setIsEditingServingTemp(false);
            setEditedServingTemp(wineData.servingTemp || "");
          }}
          isSaving={isSavingWine}
          placeholder="e.g., 16-18 C"
          emptyText="Tap to add serving temp"
          showClickToEdit={false}
        />
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
  );
}
