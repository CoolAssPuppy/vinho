"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Loader2,
  Wine,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { scanWineLabel } from "@/lib/actions/scan";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import type { ScanStatus, ScanResult } from "@/lib/types/shared";

export default function ScanPage() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Note: Global Realtime provider handles background processing notifications

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await performScan(file);
  };

  const performScan = async (file: File) => {
    setScanStatus("uploading");
    setProcessingMessage("Uploading image...");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        setScanStatus("processing");
        setProcessingMessage("Analyzing wine label...");

        try {
          const result = await scanWineLabel(base64);

          setScanResult({
            scanId: result.scanId,
            queueItemId: result.queueItemId,
            wineData: result.wineData,
          });

          // Immediately show success and let processing happen in background
          setScanStatus("completed");
          setProcessingMessage("Wine successfully uploaded!");

          toast.success(
            "Wine uploaded! Our expert sommeliers are analyzing your wine and it will be added to your collection shortly.",
          );
        } catch (error) {
          console.error("Scan failed:", error);
          setScanStatus("error");
          setScanResult({ scanId: "", error: "Failed to process wine label" });
          toast.error("Failed to scan wine label. Please try again.");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed:", error);
      setScanStatus("error");
      setScanResult({ scanId: "", error: "Failed to upload image" });
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const resetScan = () => {
    setScanStatus("idle");
    setImagePreview(null);
    setScanResult(null);
    setProcessingMessage("");
  };

  const getStatusIcon = () => {
    switch (scanStatus) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Wine className="h-6 w-6 text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (scanStatus) {
      case "uploading":
      case "processing":
        return "border-primary/50 bg-primary/5";
      case "completed":
        return "border-green-500/50 bg-green-50";
      case "error":
        return "border-red-500/50 bg-red-50";
      default:
        return "border-primary/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              Scan Wine Label
            </h1>
            <p className="text-muted-foreground">
              Capture or upload a wine label to discover its story and add it to
              your collection
            </p>
          </div>

          <Card className={`${getStatusColor()} transition-all duration-300`}>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-6">
                {imagePreview ? (
                  <div className="relative w-full max-w-md">
                    <Image
                      src={imagePreview}
                      alt="Wine label preview"
                      width={400}
                      height={600}
                      className="rounded-lg object-contain border border-border"
                    />

                    {/* Processing Overlay */}
                    {(scanStatus === "uploading" ||
                      scanStatus === "processing") && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                          <p className="text-lg font-medium mb-2">
                            {processingMessage}
                          </p>
                          <div className="w-48 bg-muted rounded-full h-2 mx-auto">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-1000"
                              style={{
                                width:
                                  scanStatus === "uploading" ? "25%" : "75%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success Overlay */}
                    {scanStatus === "completed" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-50/95 rounded-lg">
                        <div className="text-center p-4">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                          <p className="text-lg font-medium text-green-700 mb-2">
                            Wine Uploaded Successfully!
                          </p>
                          <p className="text-sm text-green-600 mb-2">
                            Our expert sommeliers are analyzing your wine
                          </p>
                          <p className="text-xs text-green-600">
                            It will be added to your collection shortly
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Error Overlay */}
                    {scanStatus === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-50/95 rounded-lg">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                          <p className="text-lg font-medium text-red-700 mb-2">
                            Scan Failed
                          </p>
                          <p className="text-sm text-red-600">
                            {scanResult?.error}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                      <Camera className="h-16 w-16 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">
                        Ready to scan your first wine?
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Take a photo or upload an image of a wine label to get
                        started
                      </p>
                    </div>
                  </>
                )}

                {/* Status Information */}
                {scanStatus !== "idle" && (
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                    {getStatusIcon()}
                    <span className="font-medium">
                      {scanStatus === "uploading" && "Uploading..."}
                      {scanStatus === "processing" && "Processing..."}
                      {scanStatus === "completed" && "Complete"}
                      {scanStatus === "error" && "Error"}
                    </span>
                    {processingMessage && scanStatus === "processing" && (
                      <span className="text-muted-foreground">
                        • {processingMessage}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {scanStatus === "completed" ? (
                    <div className="flex gap-4">
                      <Button
                        onClick={() => (window.location.href = "/journal")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Wine className="mr-2 h-4 w-4" />
                        View Journal
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetScan}
                        className="border-primary/20 hover:bg-primary/5"
                      >
                        Scan Another
                      </Button>
                    </div>
                  ) : scanStatus === "error" ? (
                    <div className="flex gap-4">
                      <Button
                        onClick={resetScan}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <Button
                        onClick={handleCameraCapture}
                        disabled={
                          scanStatus === "uploading" ||
                          scanStatus === "processing"
                        }
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={
                          scanStatus === "uploading" ||
                          scanStatus === "processing"
                        }
                        className="border-primary/20 hover:bg-primary/5"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                    </div>
                  )}
                </div>

                {/* Helper Text */}
                {!imagePreview && scanStatus === "idle" && (
                  <div className="mt-8 p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-center text-accent-foreground">
                      <Wine className="inline h-4 w-4 mr-1" />
                      Each scan helps build your personal wine journey and
                      recommendations
                    </p>
                  </div>
                )}

                {/* Processing Queue Info */}
                {scanStatus === "processing" && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-center text-blue-700">
                      <Loader2 className="inline h-4 w-4 mr-1 animate-spin" />
                      Uploading your wine image...
                    </p>
                  </div>
                )}

                {/* Background Processing Info */}
                {scanStatus === "completed" && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-center text-amber-700">
                      <Wine className="inline h-4 w-4 mr-1" />
                      Your wine is being analyzed in the background. Check your
                      journal for updates!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Privacy Notice
                </p>
                <p className="text-xs text-amber-700">
                  Wine label images are processed by third-party AI services to
                  identify wine details. Please ensure your photos focus only on
                  the wine label and avoid including personal information or
                  background details that you don't want to share.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
