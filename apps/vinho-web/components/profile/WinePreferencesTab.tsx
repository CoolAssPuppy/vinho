"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { VivinoMigration } from "@/app/components/vivino-migration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/components/providers/user-provider";

// Wine types
const WINE_TYPES = [
  "Red Wine",
  "White Wine",
  "Sparkling Wine",
  "Rosé Wine",
  "Fortified Wine",
  "Dessert Wine",
  "Orange Wine",
  "Natural Wine",
  "Organic Wine",
  "Biodynamic Wine",
];

// Top 20 most popular wine regions
const POPULAR_REGIONS = [
  "Bordeaux",
  "Burgundy",
  "Champagne",
  "Tuscany",
  "Piedmont",
  "Rioja",
  "Napa Valley",
  "Sonoma",
  "Barossa Valley",
  "Marlborough",
  "Mosel",
  "Douro",
  "Priorat",
  "Ribera del Duero",
  "Alsace",
  "Loire Valley",
  "Rhône Valley",
  "Prosecco",
  "Porto",
  "Sauternes",
];

// Additional regions (80 more for typeahead)
const ADDITIONAL_REGIONS = [
  "Côtes du Rhône",
  "Châteauneuf-du-Pape",
  "Gigondas",
  "Vacqueyras",
  "Hermitage",
  "Côte-Rôtie",
  "Condrieu",
  "Beaujolais",
  "Mâcon",
  "Chablis",
  "Côte de Nuits",
  "Côte de Beaune",
  "Champagne",
  "Côte des Blancs",
  "Montagne de Reims",
  "Valle d'Aosta",
  "Friuli-Venezia Giulia",
  "Veneto",
  "Emilia-Romagna",
  "Sicily",
  "Campania",
  "Puglia",
  "Abruzzo",
  "Marche",
  "Umbria",
  "Catalonia",
  "Castilla y León",
  "Galicia",
  "Andalusia",
  "Valencia",
  "Cava",
  "Jerez",
  "Montsant",
  "Toro",
  "Bierzo",
  "Central Coast",
  "Central Valley",
  "Willamette Valley",
  "Columbia Valley",
  "Finger Lakes",
  "Hudson Valley",
  "Long Island",
  "Texas Hill Country",
  "Virginia",
  "Oregon",
  "British Columbia",
  "Niagara Peninsula",
  "Okanagan Valley",
  "Prince Edward County",
  "Nova Scotia",
  "Coonawarra",
  "Margaret River",
  "Hunter Valley",
  "Yarra Valley",
  "Adelaide Hills",
  "Clare Valley",
  "Eden Valley",
  "McLaren Vale",
  "Mornington Peninsula",
  "Tasmania",
  "Central Otago",
  "Hawke's Bay",
  "Wairarapa",
  "Canterbury",
  "Waipara",
  "Rheingau",
  "Pfalz",
  "Baden",
  "Franken",
  "Sachsen",
  "Württemberg",
  "Ahr",
  "Nahe",
  "Mittelrhein",
  "Saale-Unstrut",
  "Minho",
  "Trás-os-Montes",
  "Beira Interior",
  "Lisboa",
  "Alentejo",
  "Setúbal",
  "Algarve",
  "Madeira",
  "Azores",
  "Dão",
  "Bairrada",
  "Tejo",
  "Península de Setúbal",
  "Palmela",
  "Arruda",
  "Bucelas",
  "Colares",
  "Lourinhã",
  "Óbidos",
  "Torres Vedras",
];

// Popular grape varietals
const GRAPE_VARIETALS = [
  "Cabernet Sauvignon",
  "Merlot",
  "Pinot Noir",
  "Syrah",
  "Shiraz",
  "Malbec",
  "Cabernet Franc",
  "Sangiovese",
  "Nebbiolo",
  "Barbera",
  "Dolcetto",
  "Corvina",
  "Montepulciano",
  "Aglianico",
  "Primitivo",
  "Tempranillo",
  "Garnacha",
  "Mencía",
  "Graciano",
  "Cariñena",
  "Chardonnay",
  "Sauvignon Blanc",
  "Riesling",
  "Pinot Grigio",
  "Pinot Gris",
  "Chenin Blanc",
  "Viognier",
  "Gewürztraminer",
  "Albariño",
  "Verdejo",
  "Torrontés",
  "Muscat",
  "Semillon",
  "Marsanne",
  "Roussanne",
  "Grenache Blanc",
  "Picpoul",
  "Muscadet",
  "Chasselas",
  "Silvaner",
  "Grüner Veltliner",
  "Furmint",
  "Hárslevelű",
  "Sauvignon",
  "Sémillon",
  "Muscadelle",
  "Colombard",
  "Ugni Blanc",
  "Trebbiano",
  "Vermentino",
  "Falanghina",
  "Fiano",
  "Greco di Tufo",
  "Carricante",
  "Nero d'Avola",
  "Frappato",
  "Nerello Mascalese",
  "Cataratto",
  "Inzolia",
  "Grillo",
];

// Wine styles/descriptors
const WINE_STYLES = [
  "Light-bodied",
  "Medium-bodied",
  "Full-bodied",
  "High acidity",
  "Low acidity",
  "High tannins",
  "Soft tannins",
  "High alcohol",
  "Low alcohol",
  "High minerality",
  "Fruity",
  "Floral",
  "Spicy",
  "Earthy",
  "Herbaceous",
  "Oaky",
  "Smoky",
  "Toasty",
  "Vanilla",
  "Buttery",
  "Creamy",
  "Crisp",
  "Fresh",
  "Rich",
  "Elegant",
  "Complex",
  "Simple",
  "Smooth",
  "Velvety",
  "Silky",
  "Dry",
  "Off-dry",
  "Sweet",
  "Dessert",
  "Fortified",
  "Sparkling",
  "Still",
  "Natural",
  "Organic",
  "Biodynamic",
  "Old World",
  "New World",
  "Classic",
  "Modern",
  "Traditional",
  "Experimental",
  "Minimal intervention",
  "Skin contact",
  "Amphora",
  "Concrete",
];

interface WinePreferences {
  wine_types: string[];
  favorite_regions: string[];
  favorite_varietals: string[];
  favorite_styles: string[];
  price_range: { low: number; high: number };
  tasting_note_style: string;
}

interface WinePreferencesTabProps {
  onPreferencesChange?: (preferences: WinePreferences) => void;
}

export function WinePreferencesTab({
  onPreferencesChange,
}: WinePreferencesTabProps) {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<WinePreferences>({
    wine_types: [],
    favorite_regions: [],
    favorite_varietals: [],
    favorite_styles: [],
    price_range: { low: 20, high: 100 },
    tasting_note_style: "Casual",
  });

  const [customRegion, setCustomRegion] = useState("");
  const [showCustomRegion, setShowCustomRegion] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // Load existing preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select(
          "wine_preferences, favorite_regions, favorite_varietals, favorite_styles, price_range, tasting_note_style",
        )
        .eq("id", user.id)
        .single();

      if (data) {
        const winePrefs = (data.wine_preferences as Record<string, any>) || {};
        const priceRange = (data.price_range as {
          low: number;
          high: number;
        }) || { low: 20, high: 100 };
        setPreferences({
          wine_types: winePrefs.wine_types || [],
          favorite_regions: data.favorite_regions || [],
          favorite_varietals: data.favorite_varietals || [],
          favorite_styles: data.favorite_styles || [],
          price_range: priceRange,
          tasting_note_style: data.tasting_note_style || "Casual",
        });
      }
    };

    loadPreferences();
  }, [user]);

  const savePreferences = async () => {
    if (!user) return;

    setSaveStatus("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        wine_preferences: {
          wine_types: preferences.wine_types,
        },
        favorite_regions: preferences.favorite_regions,
        favorite_varietals: preferences.favorite_varietals,
        favorite_styles: preferences.favorite_styles,
        price_range: preferences.price_range,
        tasting_note_style: preferences.tasting_note_style,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (!error) {
      onPreferencesChange?.(preferences);
      setSaveStatus("saved");
      // Reset to idle after 2.5 seconds
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("idle");
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  const toggleWineType = (type: string) => {
    const newTypes = toggleArrayItem(preferences.wine_types, type);
    setPreferences((prev) => ({ ...prev, wine_types: newTypes }));
  };

  const toggleRegion = (region: string) => {
    const newRegions = toggleArrayItem(preferences.favorite_regions, region);
    setPreferences((prev) => ({ ...prev, favorite_regions: newRegions }));
  };

  const toggleVarietal = (varietal: string) => {
    const newVarietals = toggleArrayItem(
      preferences.favorite_varietals,
      varietal,
    );
    setPreferences((prev) => ({ ...prev, favorite_varietals: newVarietals }));
  };

  const toggleStyle = (style: string) => {
    const newStyles = toggleArrayItem(preferences.favorite_styles, style);
    setPreferences((prev) => ({ ...prev, favorite_styles: newStyles }));
  };

  const addCustomRegion = () => {
    if (
      customRegion.trim() &&
      !preferences.favorite_regions.includes(customRegion.trim())
    ) {
      const newRegions = [...preferences.favorite_regions, customRegion.trim()];
      setPreferences((prev) => ({ ...prev, favorite_regions: newRegions }));
      setCustomRegion("");
      setShowCustomRegion(false);
    }
  };

  const filteredRegions = customRegion
    ? ADDITIONAL_REGIONS.filter(
        (region) =>
          region.toLowerCase().includes(customRegion.toLowerCase()) &&
          !preferences.favorite_regions.includes(region),
      )
    : [];

  const PillButton = ({
    label,
    isSelected,
    onClick,
  }: {
    label: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
        isSelected
          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          : "bg-transparent text-primary border-2 border-primary hover:bg-primary/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Wine Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Wine Types</CardTitle>
          <CardDescription className="text-base">
            What types of wine do you enjoy?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {WINE_TYPES.map((type) => (
              <PillButton
                key={type}
                label={type}
                isSelected={preferences.wine_types.includes(type)}
                onClick={() => toggleWineType(type)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Regions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Favorite Regions</CardTitle>
          <CardDescription className="text-base">
            Which wine regions do you love?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Popular regions */}
            {POPULAR_REGIONS.map((region) => (
              <PillButton
                key={region}
                label={region}
                isSelected={preferences.favorite_regions.includes(region)}
                onClick={() => toggleRegion(region)}
              />
            ))}
            {/* Custom regions (not in popular list) */}
            {preferences.favorite_regions
              .filter((region) => !POPULAR_REGIONS.includes(region))
              .map((region) => (
                <PillButton
                  key={region}
                  label={region}
                  isSelected={true}
                  onClick={() => toggleRegion(region)}
                />
              ))}
          </div>

          {/* Custom Region Input */}
          <div className="space-y-3">
            {!showCustomRegion ? (
              <Button
                variant="outline"
                onClick={() => setShowCustomRegion(true)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                + Add Custom Region
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  placeholder="Enter region name..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && addCustomRegion()}
                />
                <Button onClick={addCustomRegion} size="sm">
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomRegion("");
                    setShowCustomRegion(false);
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Typeahead suggestions */}
            {customRegion && filteredRegions.length > 0 && (
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md bg-gray-50">
                {filteredRegions.slice(0, 10).map((region) => (
                  <button
                    key={region}
                    onClick={() => {
                      setCustomRegion(region);
                      addCustomRegion();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-primary/10"
                  >
                    {region}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Varietals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Favorite Grape Varietals</CardTitle>
          <CardDescription className="text-base">
            Which grape varieties do you prefer?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {GRAPE_VARIETALS.map((varietal) => (
              <PillButton
                key={varietal}
                label={varietal}
                isSelected={preferences.favorite_varietals.includes(varietal)}
                onClick={() => toggleVarietal(varietal)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wine Styles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Wine Styles</CardTitle>
          <CardDescription className="text-base">
            What wine characteristics do you enjoy?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {WINE_STYLES.map((style) => (
              <PillButton
                key={style}
                label={style}
                isSelected={preferences.favorite_styles.includes(style)}
                onClick={() => toggleStyle(style)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Additional Preferences</CardTitle>
          <CardDescription className="text-base">
            Fine-tune your wine preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base">Price Range (USD)</Label>
            <div className="space-y-4">
              {/* Low Price Range */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Minimum Price
                </Label>
                <div className="px-2">
                  <Slider
                    value={[preferences.price_range.low]}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        price_range: {
                          ...prev.price_range,
                          low: Math.min(value[0], prev.price_range.high - 10),
                        },
                      }))
                    }
                    max={preferences.price_range.high - 10}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-center text-base text-muted-foreground mt-2">
                    <span>${preferences.price_range.low}</span>
                  </div>
                </div>
              </div>

              {/* High Price Range */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Maximum Price
                </Label>
                <div className="px-2">
                  <Slider
                    value={[preferences.price_range.high]}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        price_range: {
                          ...prev.price_range,
                          high: Math.max(value[0], prev.price_range.low + 10),
                        },
                      }))
                    }
                    max={500}
                    min={preferences.price_range.low + 10}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-center text-base text-muted-foreground mt-2">
                    <span>${preferences.price_range.high}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="tasting-style" className="text-base">
              Tasting Note Style
            </Label>
            <Select
              value={preferences.tasting_note_style}
              onValueChange={(value) =>
                setPreferences((prev) => ({
                  ...prev,
                  tasting_note_style: value,
                }))
              }
            >
              <SelectTrigger className="text-base h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Professional Sommelier">
                  Professional Sommelier
                </SelectItem>
                <SelectItem value="Professional Winemaker">
                  Professional Winemaker
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          className="text-base px-6 py-2"
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved!"
              : "Save Preferences"}
        </Button>
      </div>

      {/* Vivino Migration Section */}
      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Import from Vivino</CardTitle>
          <CardDescription className="text-base">
            Migrate your wine collection and tasting history from Vivino
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VivinoMigration />
        </CardContent>
      </Card>
    </div>
  );
}
