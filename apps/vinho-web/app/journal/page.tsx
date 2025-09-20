"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Wine, MapPin, Star, Plus, TrendingUp, Award, BookOpen } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Tasting {
  id: string
  wine: {
    name: string
    producer: string
    region: string
    year: number
    varietals: string[]
  }
  tastedAt: Date
  verdict: number
  notes: string
  tags: string[]
}

const SAMPLE_TASTINGS: Tasting[] = [
  {
    id: "1",
    wine: {
      name: "La Tâche Grand Cru",
      producer: "Domaine de la Romanée-Conti",
      region: "Burgundy, France",
      year: 2019,
      varietals: ["Pinot Noir"]
    },
    tastedAt: new Date("2024-12-01"),
    verdict: 95,
    notes: "Exceptional complexity with layers of red fruit, forest floor, and exotic spices. Silky tannins and endless finish.",
    tags: ["elegant", "complex", "age-worthy"]
  },
  {
    id: "2",
    wine: {
      name: "Opus One",
      producer: "Opus One Winery",
      region: "Napa Valley, USA",
      year: 2019,
      varietals: ["Cabernet Sauvignon", "Cabernet Franc", "Merlot"]
    },
    tastedAt: new Date("2024-11-15"),
    verdict: 92,
    notes: "Bold and structured with blackberry, cassis, and cedar notes. Well-integrated oak and velvety texture.",
    tags: ["powerful", "structured", "modern"]
  },
  {
    id: "3",
    wine: {
      name: "Château Margaux",
      producer: "Château Margaux",
      region: "Bordeaux, France",
      year: 2018,
      varietals: ["Cabernet Sauvignon", "Merlot", "Cabernet Franc", "Petit Verdot"]
    },
    tastedAt: new Date("2024-11-01"),
    verdict: 97,
    notes: "Perfumed nose of violets and dark berries. Perfect balance between power and elegance. A masterpiece.",
    tags: ["classic", "balanced", "refined"]
  }
]

export default function JournalPage() {
  const [tastings] = useState<Tasting[]>(SAMPLE_TASTINGS)
  // const [selectedTasting] = useState<Tasting | null>(null)
  const [newTastingOpen, setNewTastingOpen] = useState(false)
  const [view, setView] = useState<"list" | "stats">("list")

  const averageRating = tastings.reduce((sum, t) => sum + t.verdict, 0) / tastings.length
  const topRegions = Array.from(new Set(tastings.map(t => t.wine.region.split(",")[0])))
  const totalTastings = tastings.length

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasting Journal</h1>
          <p className="text-muted-foreground mt-2">
            Track your wine journey and see how your palate evolves over time.
          </p>
        </div>
        <Dialog open={newTastingOpen} onOpenChange={setNewTastingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Tasting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record New Tasting</DialogTitle>
              <DialogDescription>
                Add a wine to your tasting journal and record your impressions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Wine Selection</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Search for a wine or scan label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scan">Scan wine label</SelectItem>
                    <SelectItem value="search">Search by name</SelectItem>
                    <SelectItem value="recent">Recent wines</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Verdict (0-100)</Label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  defaultValue="85"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tasting Notes</Label>
                <Textarea
                  placeholder="Describe the appearance, aroma, taste, and finish..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {["fruity", "oaky", "tannic", "smooth", "complex", "light", "bold", "earthy"].map(tag => (
                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={() => setNewTastingOpen(false)}>
                Save Tasting
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Tastings</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="grid gap-4">
            {tastings.map((tasting) => (
              <Card
                key={tasting.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => console.log('View tasting:', tasting.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{tasting.wine.name}</CardTitle>
                      <CardDescription>
                        {tasting.wine.producer} • {tasting.wine.year}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{tasting.verdict}</div>
                      <div className="text-xs text-muted-foreground">verdict</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(tasting.tastedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tasting.wine.region}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 mb-3">{tasting.notes}</p>
                  <div className="flex gap-2">
                    {tasting.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tastings</CardTitle>
                <Wine className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTastings}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  Your palate is developing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Regions</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{topRegions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {topRegions.slice(0, 2).join(", ")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tasting Progress</CardTitle>
              <CardDescription>
                Your wine education journey over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">French Wines</span>
                    <span className="text-sm text-muted-foreground">67%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "67%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">American Wines</span>
                    <span className="text-sm text-muted-foreground">33%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "33%" }} />
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm">Burgundy Explorer - Tasted 2+ Grand Crus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm">Terroir Scholar - Learned about 3+ soil types</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}