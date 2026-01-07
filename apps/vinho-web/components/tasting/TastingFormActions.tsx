"use client";

import { Button } from "@/components/ui/button";
import type { TastingFormActionsProps } from "./types";

export function TastingFormActions({
  isSaving,
  tastingId,
  onSave,
  onDelete,
  onCancel,
  saveDisabled = false,
  size = "default",
}: TastingFormActionsProps) {
  return (
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
          onClick={onSave}
          disabled={isSaving || saveDisabled}
          className="bg-black text-white hover:bg-gray-800"
          size={size}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
