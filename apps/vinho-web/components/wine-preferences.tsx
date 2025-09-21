"use client";

import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { X, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { wineRegions, grapeVarietals, wineStyles } from "@/lib/wine-data";
import type { Database } from "@/types/database";

interface WinePreferencesProps {
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  userId: string;
}

export function WinePreferences({ profile, userId }: WinePreferencesProps) {
  const [favoriteRegions, setFavoriteRegions] = useState<string[]>([]);
  const [favoriteVarietals, setFavoriteVarietals] = useState<string[]>([]);
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>([]);

  const [regionSearch, setRegionSearch] = useState("");
  const [varietalSearch, setVarietalSearch] = useState("");
  const [styleSearch, setStyleSearch] = useState("");

  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showVarietalDropdown, setShowVarietalDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const [saving, setSaving] = useState(false);

  const regionRef = useRef<HTMLDivElement>(null);
  const varietalRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    if (profile?.favorite_regions) {
      setFavoriteRegions(profile.favorite_regions as string[]);
    }
    if (profile?.favorite_varietals) {
      setFavoriteVarietals(profile.favorite_varietals as string[]);
    }
    if (profile?.favorite_styles) {
      setFavoriteStyles(profile.favorite_styles as string[]);
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        regionRef.current &&
        !regionRef.current.contains(event.target as Node)
      ) {
        setShowRegionDropdown(false);
      }
      if (
        varietalRef.current &&
        !varietalRef.current.contains(event.target as Node)
      ) {
        setShowVarietalDropdown(false);
      }
      if (
        styleRef.current &&
        !styleRef.current.contains(event.target as Node)
      ) {
        setShowStyleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRegions = wineRegions.filter(
    (region) =>
      region.toLowerCase().includes(regionSearch.toLowerCase()) &&
      !favoriteRegions.includes(region),
  );

  const filteredVarietals = grapeVarietals.filter(
    (varietal) =>
      varietal.toLowerCase().includes(varietalSearch.toLowerCase()) &&
      !favoriteVarietals.includes(varietal),
  );

  const filteredStyles = wineStyles.filter(
    (style) =>
      style.toLowerCase().includes(styleSearch.toLowerCase()) &&
      !favoriteStyles.includes(style),
  );

  const addRegion = (region: string) => {
    setFavoriteRegions((prev) => [...prev, region]);
    setRegionSearch("");
    setShowRegionDropdown(false);
  };

  const removeRegion = (region: string) => {
    setFavoriteRegions((prev) => prev.filter((r) => r !== region));
  };

  const addVarietal = (varietal: string) => {
    setFavoriteVarietals((prev) => [...prev, varietal]);
    setVarietalSearch("");
    setShowVarietalDropdown(false);
  };

  const removeVarietal = (varietal: string) => {
    setFavoriteVarietals((prev) => prev.filter((v) => v !== varietal));
  };

  const addStyle = (style: string) => {
    setFavoriteStyles((prev) => [...prev, style]);
    setStyleSearch("");
    setShowStyleDropdown(false);
  };

  const removeStyle = (style: string) => {
    setFavoriteStyles((prev) => prev.filter((s) => s !== style));
  };

  const savePreferences = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          favorite_regions: favoriteRegions,
          favorite_varietals: favoriteVarietals,
          favorite_styles: favoriteStyles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Wine preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Favorite Wine Regions</CardTitle>
          <CardDescription>
            Add regions you love or want to explore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={regionRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wine regions..."
                value={regionSearch}
                onChange={(e) => setRegionSearch(e.target.value)}
                onFocus={() => setShowRegionDropdown(true)}
                className="pl-9"
              />
            </div>
            {showRegionDropdown && filteredRegions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredRegions.slice(0, 10).map((region) => (
                  <button
                    key={region}
                    onClick={() => addRegion(region)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  >
                    {region}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteRegions.map((region) => (
              <Badge
                key={region}
                variant="secondary"
                className="pl-3 pr-1 py-1"
              >
                {region}
                <button
                  onClick={() => removeRegion(region)}
                  className="ml-2 hover:bg-secondary-foreground/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Grape Varietals</CardTitle>
          <CardDescription>
            Select grapes that match your palate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={varietalRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grape varietals..."
                value={varietalSearch}
                onChange={(e) => setVarietalSearch(e.target.value)}
                onFocus={() => setShowVarietalDropdown(true)}
                className="pl-9"
              />
            </div>
            {showVarietalDropdown && filteredVarietals.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredVarietals.slice(0, 10).map((varietal) => (
                  <button
                    key={varietal}
                    onClick={() => addVarietal(varietal)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  >
                    {varietal}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteVarietals.map((varietal) => (
              <Badge
                key={varietal}
                variant="secondary"
                className="pl-3 pr-1 py-1"
              >
                {varietal}
                <button
                  onClick={() => removeVarietal(varietal)}
                  className="ml-2 hover:bg-secondary-foreground/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Wine Styles</CardTitle>
          <CardDescription>Choose styles that suit your taste</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={styleRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wine styles..."
                value={styleSearch}
                onChange={(e) => setStyleSearch(e.target.value)}
                onFocus={() => setShowStyleDropdown(true)}
                className="pl-9"
              />
            </div>
            {showStyleDropdown && filteredStyles.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredStyles.slice(0, 10).map((style) => (
                  <button
                    key={style}
                    onClick={() => addStyle(style)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteStyles.map((style) => (
              <Badge key={style} variant="secondary" className="pl-3 pr-1 py-1">
                {style}
                <button
                  onClick={() => removeStyle(style)}
                  className="ml-2 hover:bg-secondary-foreground/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? "Saving..." : "Save Wine Preferences"}
        </Button>
      </div>
    </div>
  );
}
