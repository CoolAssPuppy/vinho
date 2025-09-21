"use client";

import {
  Wine,
  Camera,
  Sparkles,
  TrendingUp,
  BookOpen,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Your Wine Journey
          </h1>
          <p className="text-muted-foreground">
            Track your tastings, discover new wines, and learn about terroir
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/scan">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Scan a Wine</h3>
                    <p className="text-sm text-muted-foreground">
                      Add to your collection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/map">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Explore Regions</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn about terroir
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/recommend">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Discover</h3>
                    <p className="text-sm text-muted-foreground">
                      Find new favorites
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Area */}
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
            <TabsTrigger value="feed">Your Feed</TabsTrigger>
            <TabsTrigger value="tastings">Tastings</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            {/* Empty State */}
            <Card className="border-dashed">
              <CardContent className="p-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wine className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">
                      Start Your Wine Journey
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Scan your first wine label to begin tracking your tastings
                      and discovering new wines tailored to your palate.
                    </p>
                  </div>
                  <Link href="/scan">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Scan Your First Wine
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation Cards (will populate after first scan) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Recommendations will appear here after your first scan
              </h3>
            </div>
          </TabsContent>

          <TabsContent value="tastings" className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="p-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">No Tastings Yet</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your tasting notes and wine ratings will appear here as
                      you scan and taste wines.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="p-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">
                      Insights Coming Soon
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      As you build your tasting history, we'll show you patterns
                      in your preferences, favorite regions, and palate
                      evolution.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Educational Tip */}
        <Card className="mt-8 bg-accent/20 border-accent/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Wine Tip of the Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-accent-foreground">
              <strong>Did you know?</strong> The concept of terroir encompasses
              not just soil, but also climate, topography, and local winemaking
              traditions. Two wines made from the same grape variety can taste
              completely different based on where they're grown.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
