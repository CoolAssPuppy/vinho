"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Upload, Loader2, Wine, MapPin, Calendar, Grape } from "lucide-react"

interface ScanResult {
  wine: {
    id: string
    name: string
    producer: string
    region: string
    country: string
    year: number
    varietals: Array<{ name: string; percent: number }>
    abv: number
  }
  confidence: number
}

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    await performScan(file)
  }

  const performScan = async (_file: File) => {
    setIsScanning(true)

    // Simulate OCR scan - in production this would call an Edge Function
    await new Promise(resolve => setTimeout(resolve, 2000))

    setScanResult({
      wine: {
        id: "1",
        name: "Opus One",
        producer: "Opus One Winery",
        region: "Napa Valley",
        country: "USA",
        year: 2019,
        varietals: [
          { name: "Cabernet Sauvignon", percent: 80 },
          { name: "Cabernet Franc", percent: 8 },
          { name: "Merlot", percent: 7 },
          { name: "Petit Verdot", percent: 4 },
          { name: "Malbec", percent: 1 },
        ],
        abv: 14.5
      },
      confidence: 0.92
    })

    setIsScanning(false)
  }

  const handleCameraCapture = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Scan Wine Label</h1>
          <p className="text-muted-foreground mt-2">
            Take a photo or upload an image of a wine label to learn about its origin, varietals, and terroir.
          </p>
        </div>

        {!scanResult ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                {imagePreview ? (
                  <div className="relative w-full max-w-md">
                    <Image
                      src={imagePreview}
                      alt="Wine label preview"
                      width={400}
                      height={600}
                      className="rounded-lg object-contain"
                    />
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Analyzing label...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                      <Camera className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">Capture or Upload</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Take a photo of the wine label or upload an existing image
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button onClick={handleCameraCapture} disabled={isScanning}>
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{scanResult.wine.name}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {scanResult.wine.producer}
                    </CardDescription>
                  </div>
                  <Badge variant={scanResult.confidence > 0.8 ? "default" : "secondary"}>
                    {Math.round(scanResult.confidence * 100)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {scanResult.wine.region}, {scanResult.wine.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{scanResult.wine.year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{scanResult.wine.abv}% ABV</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Grape className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {scanResult.wine.varietals.length} varietals
                    </span>
                  </div>
                </div>

                <Tabs defaultValue="varietals" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="varietals">Varietals</TabsTrigger>
                    <TabsTrigger value="terroir">Terroir</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="varietals" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      {scanResult.wine.varietals.map((varietal, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-medium">{varietal.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${varietal.percent}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-10 text-right">
                              {varietal.percent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      This Bordeaux-style blend combines the structure of Cabernet Sauvignon with the elegance of Cabernet Franc and the softness of Merlot.
                    </p>
                  </TabsContent>

                  <TabsContent value="terroir" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-1">Climate</h4>
                        <p className="text-sm text-muted-foreground">
                          Mediterranean climate (Csa) with warm, dry summers and mild winters. Morning fog from San Pablo Bay moderates temperatures.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Soil</h4>
                        <p className="text-sm text-muted-foreground">
                          Well-drained gravelly loam over volcanic ash. The rocky soil forces vines to develop deep root systems.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Elevation</h4>
                        <p className="text-sm text-muted-foreground">
                          Vineyard sits at 100-150 meters above sea level on the western benchlands of Oakville.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Founded in 1979 as a joint venture between Baron Philippe de Rothschild of Château Mouton Rothschild and Robert Mondavi, Opus One represents the marriage of Old World tradition with New World innovation.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The winery pioneered the concept of ultra-premium Napa Valley wines, proving that California could produce wines rivaling the great estates of Bordeaux.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The iconic winery, designed by architect Scott Johnson, features a dramatic semicircular barrel room that has become a landmark in the valley.
                    </p>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 mt-6">
                  <Button className="flex-1">Add to Journal</Button>
                  <Button variant="outline" className="flex-1">Find Similar Wines</Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setScanResult(null)
                  setImagePreview(null)
                }}
              >
                Scan Another Wine
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}