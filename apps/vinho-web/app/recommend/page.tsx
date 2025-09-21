"use client";

import { Wine } from "lucide-react";

export default function RecommendPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Wine className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-primary mb-4">
          Wine Recommendations
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Scan some wines to start seeing personalized recommendations
        </p>
        <div className="p-6 bg-accent/20 rounded-lg">
          <p className="text-sm text-accent-foreground">
            As you scan and taste wines, we'll learn your preferences and
            suggest wines you'll love based on terroir, varietals, and your
            unique palate.
          </p>
        </div>
      </div>
    </div>
  );
}
