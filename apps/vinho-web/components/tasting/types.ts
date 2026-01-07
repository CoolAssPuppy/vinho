/**
 * Shared types for tasting form components
 */

export type TastingStyle = "casual" | "sommelier" | "winemaker" | null;

export interface LocationData {
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface WineData {
  id?: string;
  name: string;
  description: string | null;
  producerName: string;
  varietal: string | null;
  style: string | null;
  servingTemp: string | null;
  foodPairings: string[] | null;
  region: string | null;
  year: number | null;
}

export interface TastingFormActionsProps {
  isSaving: boolean;
  tastingId?: string;
  onSave: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  saveDisabled?: boolean;
  size?: "default" | "lg";
}

export interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: "default" | "large";
}

export interface WineImageDisplayProps {
  imageUrl: string | null | undefined;
  alt?: string;
}

export interface LocationPickerProps {
  location: LocationData;
  onLocationChange: (location: LocationData) => void;
  label?: string;
}

export interface TastingNotesInputProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  label?: string;
  id?: string;
  monospace?: boolean;
}

export interface WineInfoEditorProps {
  wineData: WineData;
  vintageId: string;
  onWineDataChange?: (data: Partial<WineData>) => void;
}

export interface PlaceSelection {
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}
