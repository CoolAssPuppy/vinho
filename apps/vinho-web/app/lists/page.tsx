"use client";

import { FileText } from "lucide-react";

export default function ListsPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-primary mb-4">
          Restaurant Wine Lists
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Discover wines at your favorite restaurants
        </p>
        <div className="p-6 bg-accent/20 rounded-lg">
          <p className="text-sm text-accent-foreground">
            Upload restaurant wine lists or share URLs to get personalized
            recommendations and educational insights about wines available near
            you.
          </p>
        </div>
      </div>
    </div>
  );
}
