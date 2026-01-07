"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditableFieldProps {
  label: string;
  value: string;
  editedValue: string;
  onEditedValueChange: (value: string) => void;
  isEditing: boolean;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  placeholder?: string;
  emptyText?: string;
  multiline?: boolean;
  displayClassName?: string;
  showClickToEdit?: boolean;
}

export function EditableField({
  label,
  value,
  editedValue,
  onEditedValueChange,
  isEditing,
  onStartEditing,
  onSave,
  onCancel,
  isSaving,
  placeholder = "",
  emptyText = "Tap to add",
  multiline = false,
  displayClassName = "",
  showClickToEdit = true,
}: EditableFieldProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {isEditing ? (
        <div className={multiline ? "space-y-2" : "flex gap-2"}>
          {multiline ? (
            <Textarea
              value={editedValue}
              onChange={(e) => onEditedValueChange(e.target.value)}
              className="min-h-[100px]"
              placeholder={placeholder}
              disabled={isSaving}
            />
          ) : (
            <Input
              value={editedValue}
              onChange={(e) => onEditedValueChange(e.target.value)}
              className="flex-1"
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={isSaving}
            />
          )}
          <div className={multiline ? "flex gap-2 justify-end" : "flex gap-2"}>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving || (!multiline && !editedValue.trim())}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
            multiline ? "min-h-[60px]" : ""
          }`}
          onClick={onStartEditing}
        >
          <p className={displayClassName || (multiline ? "text-sm whitespace-pre-wrap" : "")}>
            {value || emptyText}
          </p>
          {showClickToEdit && (
            <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
          )}
        </div>
      )}
    </div>
  );
}
