"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Link2, Wine, MapPin, TrendingUp, Heart } from "lucide-react"

interface Restaurant {
  id: string
  name: string
  url: string
  wineCount: number
  priceRange: string
  lastUpdated: Date
  favorited: boolean
}

interface WineListItem {
  id: string
  name: string
  producer: string
  region: string
  year: number
  price: number
  glass: number | null
  educationalNote?: string
}

const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: "1",
    name: "The French Laundry",
    url: "frenchlaundry.com",
    wineCount: 2800,
    priceRange: "$$$$$",
    lastUpdated: new Date("2024-12-01"),
    favorited: true
  },
  {
    id: "2",
    name: "Eleven Madison Park",
    url: "elevenmadisonpark.com",
    wineCount: 1200,
    priceRange: "$$$$$",
    lastUpdated: new Date("2024-11-15"),
    favorited: true
  },
  {
    id: "3",
    name: "Local Wine Bar",
    url: "localwinebar.com",
    wineCount: 150,
    priceRange: "$$",
    lastUpdated: new Date("2024-12-10"),
    favorited: false
  }
]

const SAMPLE_WINE_LIST: WineListItem[] = [
  {
    id: "1",
    name: "Chablis Premier Cru",
    producer: "Domaine William Fèvre",
    region: "Burgundy, France",
    year: 2021,
    price: 12000,
    glass: 2200,
    educationalNote: "Chablis uses Kimmeridgian limestone soil, rich in fossilized oyster shells, giving the wine its distinctive minerality."
  },
  {
    id: "2",
    name: "Sancerre",
    producer: "Henri Bourgeois",
    region: "Loire Valley, France",
    year: 2022,
    price: 8500,
    glass: 1800,
    educationalNote: "Sancerre's three soil types (terres blanches, caillottes, silex) each impart unique characteristics to Sauvignon Blanc."
  },
  {
    id: "3",
    name: "Barolo",
    producer: "Vietti",
    region: "Piedmont, Italy",
    year: 2018,
    price: 15000,
    glass: null,
    educationalNote: "Nebbiolo grapes for Barolo must be aged minimum 38 months, with 18 in wood, creating complex tertiary aromas."
  }
]

export default function ListsPage() {
  const [restaurants] = useState<Restaurant[]>(SAMPLE_RESTAURANTS)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(restaurants[0])
  const [wineList] = useState<WineListItem[]>(SAMPLE_WINE_LIST)
  const [urlInput, setUrlInput] = useState("")
  const [view, setView] = useState<"favorites" | "browse">("favorites")

  const handleParseUrl = () => {
    // In production, this would call an Edge Function to parse the wine list
    console.log("Parsing URL:", urlInput)
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Restaurant Wine Lists</h1>
        <p className="text-muted-foreground mt-2">
          Browse and learn from curated wine lists. Discover what sommeliers are pouring and why.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Wine List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Restaurant URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="restaurant.com/wine"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <Button size="icon" onClick={handleParseUrl}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF Menu
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Restaurants</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="favorites">Favorites</TabsTrigger>
                  <TabsTrigger value="browse">Browse</TabsTrigger>
                </TabsList>
                <TabsContent value="favorites" className="space-y-2 mt-4">
                  {restaurants.filter(r => r.favorited).map((restaurant) => (
                    <button
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurant(restaurant)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedRestaurant?.id === restaurant.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium text-sm">{restaurant.name}</div>
                      <div className="text-xs opacity-80">
                        {restaurant.wineCount} wines • {restaurant.priceRange}
                      </div>
                    </button>
                  ))}
                </TabsContent>
                <TabsContent value="browse" className="space-y-2 mt-4">
                  {restaurants.map((restaurant) => (
                    <button
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurant(restaurant)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedRestaurant?.id === restaurant.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{restaurant.name}</div>
                          <div className="text-xs opacity-80">
                            {restaurant.wineCount} wines
                          </div>
                        </div>
                        {restaurant.favorited && (
                          <Heart className="h-3 w-3 fill-current mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedRestaurant && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedRestaurant.name}</CardTitle>
                      <CardDescription>
                        {selectedRestaurant.url} • Updated {selectedRestaurant.lastUpdated.toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button variant={selectedRestaurant.favorited ? "default" : "outline"} size="sm">
                      <Heart className={`h-4 w-4 ${selectedRestaurant.favorited ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedRestaurant.wineCount}</p>
                      <p className="text-xs text-muted-foreground">Total Wines</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">$85</p>
                      <p className="text-xs text-muted-foreground">Avg. Bottle</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">65%</p>
                      <p className="text-xs text-muted-foreground">French Wines</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Wine List</CardTitle>
                  <CardDescription>
                    Curated selections with educational insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {wineList.map((wine) => (
                      <div key={wine.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{wine.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {wine.producer} • {wine.year}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{wine.region}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${(wine.price / 100).toFixed(0)}</p>
                            {wine.glass && (
                              <p className="text-xs text-muted-foreground">
                                ${(wine.glass / 100).toFixed(0)} glass
                              </p>
                            )}
                          </div>
                        </div>

                        {wine.educationalNote && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                              <p className="text-sm text-muted-foreground">
                                {wine.educationalNote}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            Learn More
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Find Similar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Wine className="h-4 w-4" />
                      Sommelier&apos;s Philosophy
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This list emphasizes terroir-driven wines with a focus on sustainable and biodynamic producers.
                      The selection balances classic regions with emerging appellations, encouraging exploration while
                      maintaining approachability for all levels of wine knowledge.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}