"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TastingNotesInputProps } from "./types";

export function TastingNotesInput({
  notes,
  onNotesChange,
  placeholder = "What did you think about this wine?",
  rows = 6,
  helperText,
  label = "Tasting Notes",
  id = "notes",
  monospace = false,
}: TastingNotesInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`resize-none ${monospace ? "font-mono text-sm" : ""}`}
      />
      {helperText && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
