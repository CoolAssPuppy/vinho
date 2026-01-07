"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { EditableField } from "./EditableField";
import { WineDetailsEditor } from "./WineDetailsEditor";
import type { WineInfoEditorProps } from "./types";

export function WineInfoEditor({
  wineData,
  vintageId,
  onWineDataChange,
}: WineInfoEditorProps) {
  const supabase = createClient();

  // Wine name editing
  const [editedWineName, setEditedWineName] = useState(wineData.name);
  const [isEditingWineName, setIsEditingWineName] = useState(false);

  // Producer editing
  const [editedProducerName, setEditedProducerName] = useState(wineData.producerName);
  const [isEditingProducer, setIsEditingProducer] = useState(false);

  // Description editing
  const [editedDescription, setEditedDescription] = useState(wineData.description || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(wineData.description || "");

  // Save states
  const [isSavingWine, setIsSavingWine] = useState(false);

  if (!wineData.id) return null;

  const handleSaveWineName = async () => {
    if (!wineData.id || !editedWineName.trim()) {
      setIsEditingWineName(false);
      return;
    }

    setIsSavingWine(true);
    const { error } = await supabase
      .from("wines")
      .update({ name: editedWineName })
      .eq("id", wineData.id);

    setIsSavingWine(false);

    if (error) {
      console.error("Error updating wine name:", error);
      alert("Failed to update wine name. Please try again.");
    } else {
      setIsEditingWineName(false);
      onWineDataChange?.({ name: editedWineName });
    }
  };

  const handleSaveDescription = async () => {
    if (!wineData.id) {
      setIsEditingDescription(false);
      return;
    }

    setIsSavingWine(true);
    const { error } = await supabase
      .from("wines")
      .update({ tasting_notes: editedDescription || null })
      .eq("id", wineData.id);

    setIsSavingWine(false);

    if (error) {
      console.error("Error updating wine description:", error);
      alert("Failed to update wine description. Please try again.");
    } else {
      setIsEditingDescription(false);
      setCurrentDescription(editedDescription);
      onWineDataChange?.({ description: editedDescription || null });
    }
  };

  const handleSaveProducer = async () => {
    if (!wineData.id || !editedProducerName.trim()) {
      setIsEditingProducer(false);
      return;
    }

    setIsSavingWine(true);

    try {
      const { data: existingProducers } = await supabase
        .from("producers")
        .select("id, name")
        .ilike("name", editedProducerName.trim())
        .limit(1);

      let producerId: string;

      if (existingProducers && existingProducers.length > 0) {
        producerId = existingProducers[0].id;
      } else {
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

      const { error: updateError } = await supabase
        .from("wines")
        .update({ producer_id: producerId })
        .eq("id", wineData.id);

      if (updateError) {
        throw updateError;
      }

      setIsEditingProducer(false);
      onWineDataChange?.({ producerName: editedProducerName });
    } catch (error) {
      console.error("Error updating producer:", error);
      alert("Failed to update producer. Please try again.");
    } finally {
      setIsSavingWine(false);
    }
  };

  const handleDescriptionChangeFromAI = (description: string) => {
    setCurrentDescription(description);
    setEditedDescription(description);
    onWineDataChange?.({ description });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
      {/* Wine Name */}
      <EditableField
        label="Wine Name"
        value={wineData.name}
        editedValue={editedWineName}
        onEditedValueChange={setEditedWineName}
        isEditing={isEditingWineName}
        onStartEditing={() => setIsEditingWineName(true)}
        onSave={handleSaveWineName}
        onCancel={() => {
          setIsEditingWineName(false);
          setEditedWineName(wineData.name);
        }}
        isSaving={isSavingWine}
        placeholder="Wine name"
        emptyText="Tap to add wine name"
        displayClassName="text-lg font-semibold"
      />

      {/* Producer */}
      <EditableField
        label="Producer"
        value={wineData.producerName}
        editedValue={editedProducerName}
        onEditedValueChange={setEditedProducerName}
        isEditing={isEditingProducer}
        onStartEditing={() => setIsEditingProducer(true)}
        onSave={handleSaveProducer}
        onCancel={() => {
          setIsEditingProducer(false);
          setEditedProducerName(wineData.producerName);
        }}
        isSaving={isSavingWine}
        placeholder="Producer name"
        emptyText="Tap to add producer"
        displayClassName="font-medium text-primary"
      />

      {/* Wine Description */}
      <EditableField
        label="Wine Description"
        value={currentDescription}
        editedValue={editedDescription}
        onEditedValueChange={setEditedDescription}
        isEditing={isEditingDescription}
        onStartEditing={() => setIsEditingDescription(true)}
        onSave={handleSaveDescription}
        onCancel={() => {
          setIsEditingDescription(false);
          setEditedDescription(wineData.description || "");
        }}
        isSaving={isSavingWine}
        placeholder="Add wine description or tasting notes..."
        emptyText="Tap to add wine description"
        multiline
      />

      {/* Wine Details Section */}
      <WineDetailsEditor
        wineData={wineData}
        vintageId={vintageId}
        currentDescription={currentDescription}
        editedProducerName={editedProducerName}
        editedWineName={editedWineName}
        onDescriptionChange={handleDescriptionChangeFromAI}
      />
    </div>
  );
}
