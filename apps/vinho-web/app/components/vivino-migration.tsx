"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileUp,
  CheckCircle,
  XCircle,
  Loader2,
  Wine,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface MigrationResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  details?: {
    producers: number;
    wines: number;
    vintages: number;
    tastings: number;
  };
}

export function VivinoMigration() {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Invalid file", {
        description: "Please upload a CSV file (full_wine_list.csv)",
      });
      return;
    }

    setFile(file);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress("Reading CSV file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress("Processing wines...");

      const response = await fetch("/api/migrate/vivino", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setResult(data);

      if (data.success) {
        toast.success("Migration successful!", {
          description: `Imported ${data.imported} wines from Vivino`,
        });
      } else {
        toast.warning("Migration completed with errors", {
          description: `Imported ${data.imported} wines, ${data.failed} failed`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Migration failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsUploading(false);
      setProgress("");
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Migrate from Vivino</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Import your wine collection from Vivino to continue your journey with
          Vinho.
        </p>
      </div>

      {!result && (
        <>
          <div className="border-2 border-dashed rounded-lg p-6 bg-card">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Export your data from Vivino</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to{" "}
                    <a
                      href="https://www.vivino.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Vivino.com
                    </a>{" "}
                    → Account Settings → Privacy → Request a copy of your data
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Wait for the email</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vivino will send you an email with a download link (usually
                    within 24 hours)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Upload your data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload the{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      full_wine_list.csv
                    </code>{" "}
                    file below
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleChange}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />

            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              {file ? (
                <>
                  <FileUp className="w-12 h-12 text-primary mb-4" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    Drop your CSV file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only full_wine_list.csv from Vivino is accepted
                  </p>
                </>
              )}
            </label>
          </div>

          {file && (
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {progress || "Processing..."}
                  </>
                ) : (
                  <>
                    <Wine className="w-4 h-4 mr-2" />
                    Start Migration
                  </>
                )}
              </button>

              <button
                onClick={reset}
                disabled={isUploading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="space-y-4">
          <div
            className={`rounded-lg p-6 ${
              result.success
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            <div className="flex items-start space-x-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-medium">
                  {result.success
                    ? "Migration Successful!"
                    : "Migration Completed with Errors"}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Successfully imported {result.imported} wines from your Vivino
                  collection
                </p>
              </div>
            </div>
          </div>

          {result.details && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-2xl font-bold">{result.details.producers}</p>
                <p className="text-sm text-muted-foreground">Producers</p>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-2xl font-bold">{result.details.wines}</p>
                <p className="text-sm text-muted-foreground">Wines</p>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-2xl font-bold">{result.details.vintages}</p>
                <p className="text-sm text-muted-foreground">Vintages</p>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-2xl font-bold">{result.details.tastings}</p>
                <p className="text-sm text-muted-foreground">Tastings</p>
              </div>
            </div>
          )}

          {result.failed > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Some wines could not be imported
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.failed} wines failed to import. This is usually due
                    to missing or invalid data.
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium">Errors:</p>
                      {result.errors.slice(0, 5).map((error, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          • {error}
                        </p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          ... and {result.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>Next steps:</strong> Your wines are being enriched with
              additional data in the background. Label images are being
              processed for varietals, regions, and producer information. This
              may take a few minutes.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Import Another File
            </button>

            <a
              href="/journal"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              View Your Wines
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
