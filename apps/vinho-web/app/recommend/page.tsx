"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Wine, MapPin, Grape, Heart, TrendingUp, Globe } from "lucide-react"

interface WineRecommendation {
  id: string
  name: string
  producer: string
  region: string
  country: string
  year: number
  varietals: string[]
  similarity: number
  reason: string
  price: number
  abv: number
  educationalNote: string
}

const SAMPLE_RECOMMENDATIONS: WineRecommendation[] = [
  {
    id: "1",
    name: "Richebourg Grand Cru",
    producer: "Domaine de la Romanée-Conti",
    region: "Burgundy",
    country: "France",
    year: 2019,
    varietals: ["Pinot Noir"],
    similarity: 0.95,
    reason: "Similar terroir to La Tâche, neighboring vineyard with comparable soil composition",
    price: 450000,
    abv: 13.5,
    educationalNote: "Richebourg sits on the same limestone-rich slope as La Tâche. The 8-hectare vineyard has been cultivated since Roman times, making it one of Burgundy's most historic sites."
  },
  {
    id: "2",
    name: "Chambertin Grand Cru",
    producer: "Armand Rousseau",
    region: "Burgundy",
    country: "France",
    year: 2018,
    varietals: ["Pinot Noir"],
    similarity: 0.89,
    reason: "Another legendary Burgundy Grand Cru with similar complexity",
    price: 350000,
    abv: 13.0,
    educationalNote: "Napoleon famously drank Chambertin with every meal. This vineyard's unique iron-rich soil creates wines with distinctive earthy, truffle notes."
  },
  {
    id: "3",
    name: "Williams Selyem Pinot Noir",
    producer: "Williams Selyem",
    region: "Russian River Valley",
    country: "USA",
    year: 2020,
    varietals: ["Pinot Noir"],
    similarity: 0.78,
    reason: "New World interpretation of Burgundian style, similar elegance",
    price: 8500,
    abv: 14.1,
    educationalNote: "Williams Selyem pioneered California Pinot Noir in the 1980s. Their vineyards benefit from Pacific fog, creating a cooler climate similar to Burgundy."
  }
]

export default function RecommendPage() {
  const [recommendations] = useState<WineRecommendation[]>(SAMPLE_RECOMMENDATIONS)
  const [filterType, setFilterType] = useState<"similar" | "learning" | "trending">("similar")
  const [priceRange, setPriceRange] = useState("all")
  const [region, setRegion] = useState("all")

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Discover Wines</h1>
        <p className="text-muted-foreground mt-2">
          Explore new wines based on your preferences and expand your wine knowledge.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discovery Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Discovery Type</Label>
                <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="similar">Similar Wines</TabsTrigger>
                    <TabsTrigger value="learning">Educational</TabsTrigger>
                    <TabsTrigger value="trending">Trending</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Price Range</Label>
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="budget">Under $50</SelectItem>
                    <SelectItem value="moderate">$50 - $150</SelectItem>
                    <SelectItem value="premium">$150 - $500</SelectItem>
                    <SelectItem value="luxury">Above $500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="france">France</SelectItem>
                    <SelectItem value="italy">Italy</SelectItem>
                    <SelectItem value="spain">Spain</SelectItem>
                    <SelectItem value="usa">USA</SelectItem>
                    <SelectItem value="newworld">New World</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Surprise Me
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Prefers Pinot Noir</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Exploring Burgundy</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Developing palate</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {filterType === "similar" && "Wines You Might Love"}
              {filterType === "learning" && "Educational Selections"}
              {filterType === "trending" && "Popular This Month"}
            </h2>
            <Badge variant="secondary">
              {recommendations.length} wines found
            </Badge>
          </div>

          <div className="grid gap-4">
            {recommendations.map((wine) => (
              <Card key={wine.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{wine.name}</CardTitle>
                      <CardDescription>
                        {wine.producer} • {wine.year}
                      </CardDescription>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {wine.region}, {wine.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wine className="h-3 w-3" />
                          {wine.abv}% ABV
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={wine.similarity > 0.9 ? "default" : "secondary"}>
                        {Math.round(wine.similarity * 100)}% match
                      </Badge>
                      <p className="text-lg font-semibold mt-2">
                        ${(wine.price / 100).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Why This Wine?</p>
                    <p className="text-sm text-muted-foreground">{wine.reason}</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">Educational Note</p>
                        <p className="text-sm text-muted-foreground">
                          {wine.educationalNote}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {wine.varietals.map((varietal) => (
                      <Badge key={varietal} variant="outline">
                        <Grape className="h-3 w-3 mr-1" />
                        {varietal}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">Learn More</Button>
                    <Button variant="outline" className="flex-1">
                      <Heart className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button variant="outline">
              Load More Recommendations
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}