"use client";

import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import type { LocationPickerProps, PlaceSelection } from "./types";

export function LocationPicker({
  location,
  onLocationChange,
  label = "Where did you taste this wine? (optional)",
}: LocationPickerProps) {
  const handleSelect = (place: PlaceSelection) => {
    onLocationChange({
      name: place.name,
      address: place.address,
      city: place.city || "",
      latitude: place.latitude || null,
      longitude: place.longitude || null,
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="location" className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </Label>
      <PlaceAutocomplete
        value={location.name}
        onChange={(value) =>
          onLocationChange({
            ...location,
            name: value,
          })
        }
        onSelect={handleSelect}
        placeholder="Restaurant, bar, home, vineyard..."
        types="restaurant,bar,cafe,food"
      />
    </div>
  );
}
