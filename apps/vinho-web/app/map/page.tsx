"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Wine, MapPin, Search, X } from "lucide-react"

interface Region {
  id: string
  name: string
  country: string
  climate: string
  coordinates: [number, number]
  producers: number
  wines: number
  soilTypes: string[]
}

const SAMPLE_REGIONS: Region[] = [
  {
    id: "1",
    name: "Bordeaux",
    country: "France",
    climate: "Oceanic (Cfb)",
    coordinates: [-0.5792, 44.8378],
    producers: 7375,
    wines: 10000,
    soilTypes: ["Gravel", "Clay", "Limestone"]
  },
  {
    id: "2",
    name: "Burgundy",
    country: "France",
    climate: "Oceanic (Cfb)",
    coordinates: [4.8320, 47.3220],
    producers: 4000,
    wines: 8000,
    soilTypes: ["Limestone", "Marl", "Clay"]
  },
  {
    id: "3",
    name: "Napa Valley",
    country: "USA",
    climate: "Mediterranean (Csa)",
    coordinates: [-122.2869, 38.2975],
    producers: 475,
    wines: 1000,
    soilTypes: ["Volcanic", "Alluvial", "Clay"]
  },
  {
    id: "4",
    name: "Tuscany",
    country: "Italy",
    climate: "Mediterranean (Csa)",
    coordinates: [11.2558, 43.7696],
    producers: 600,
    wines: 1500,
    soilTypes: ["Clay", "Limestone", "Sandstone"]
  },
  {
    id: "5",
    name: "Rioja",
    country: "Spain",
    climate: "Mediterranean (Csa)",
    coordinates: [-2.6189, 42.2870],
    producers: 600,
    wines: 900,
    soilTypes: ["Clay", "Limestone", "Alluvial"]
  }
]

export default function MapPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [mapView, setMapView] = useState<"regions" | "climate" | "soil">("regions")
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const filteredRegions = SAMPLE_REGIONS.filter(region =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    // In production, initialize MapLibre GL JS here
    // For now, we'll show a placeholder
  }, [])

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wine Regions Explorer</h1>
        <p className="text-muted-foreground mt-2">
          Discover wine regions around the world. Explore terroir, climate zones, and producer locations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Interactive Map</CardTitle>
                <Tabs value={mapView} onValueChange={(v) => setMapView(v as typeof mapView)}>
                  <TabsList>
                    <TabsTrigger value="regions">Regions</TabsTrigger>
                    <TabsTrigger value="climate">Climate</TabsTrigger>
                    <TabsTrigger value="soil">Soil</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                ref={mapContainerRef}
                className="h-[600px] bg-muted relative rounded-b-lg overflow-hidden"
              >
                {/* Map placeholder - in production this would be MapLibre GL JS */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Interactive map loads here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing {mapView} view
                    </p>
                  </div>
                </div>

                {/* Region markers simulation */}
                {filteredRegions.map((region, idx) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region)}
                    className={`absolute w-3 h-3 rounded-full bg-primary hover:scale-150 transition-transform ${
                      selectedRegion?.id === region.id ? "scale-150 ring-2 ring-primary-foreground" : ""
                    }`}
                    style={{
                      top: `${20 + idx * 100}px`,
                      left: `${50 + idx * 120}px`,
                    }}
                  />
                ))}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur p-3 rounded-lg">
                  <p className="text-xs font-semibold mb-2">Legend</p>
                  {mapView === "climate" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs">Oceanic (Cfb)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-xs">Mediterranean (Csa)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs">Continental (Dfa)</span>
                      </div>
                    </div>
                  )}
                  {mapView === "soil" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-600" />
                        <span className="text-xs">Clay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span className="text-xs">Limestone</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-stone-600" />
                        <span className="text-xs">Volcanic</span>
                      </div>
                    </div>
                  )}
                  {mapView === "regions" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-xs">Wine Region</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wine className="h-3 w-3" />
                        <span className="text-xs">Producer</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {filteredRegions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRegion?.id === region.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{region.name}</div>
                    <div className="text-sm opacity-80">{region.country}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedRegion && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedRegion.name}</CardTitle>
                    <CardDescription>{selectedRegion.country}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedRegion(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Climate</p>
                      <p className="font-medium">{selectedRegion.climate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Producers</p>
                      <p className="font-medium">{selectedRegion.producers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Wines</p>
                      <p className="font-medium">{selectedRegion.wines.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Coordinates</p>
                      <p className="font-medium text-xs">
                        {selectedRegion.coordinates[1].toFixed(4)},
                        {selectedRegion.coordinates[0].toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Soil Types</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRegion.soilTypes.map((soil) => (
                        <Badge key={soil} variant="secondary">
                          {soil}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full">Explore {selectedRegion.name} Wines</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}