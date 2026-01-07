"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TastingDateInputProps {
  tastedAt: string;
  onTastedAtChange: (date: string) => void;
  id?: string;
}

export function TastingDateInput({
  tastedAt,
  onTastedAtChange,
  id = "tasted-at",
}: TastingDateInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Tasting Date</Label>
      <Input
        id={id}
        type="date"
        value={tastedAt}
        onChange={(e) => onTastedAtChange(e.target.value)}
      />
    </div>
  );
}
