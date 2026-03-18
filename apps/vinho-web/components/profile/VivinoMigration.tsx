"use client";

import { useState, useCallback, useRef } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { createClient } from "@/lib/supabase";
import {
  Upload,
  FileUp,
  CheckCircle,
  XCircle,
  Loader2,
  Wine,
  AlertCircle,
  Sparkles,
  Database,
  Clock,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { MigrationResult, QueueStatus } from "@/lib/types/shared";

// -- Sub-components --

function FileUploadZone({
  file,
  dragActive,
  isUploading,
  onDrag,
  onDrop,
  onChange,
}: {
  file: File | null;
  dragActive: boolean;
  isUploading: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept=".csv"
        onChange={onChange}
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
  );
}

function MigrationResults({
  result,
  onReset,
}: {
  result: MigrationResult;
  onReset: () => void;
}) {
  return (
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
              Successfully imported {result.imported || 0} wines from your Vivino
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

      {result.failed && result.failed > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">
                Some wines could not be imported
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.failed || 0} wines failed to import. This is usually due
                to missing or invalid data.
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">Errors:</p>
                  {result.errors?.slice(0, 5).map((error, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {error}
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
          onClick={onReset}
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
  );
}

function EnhancementStatus({
  queueStatus,
  onRefresh,
}: {
  queueStatus: QueueStatus;
  onRefresh: () => void;
}) {
  if (queueStatus.total === 0) return null;

  return (
    <div className="space-y-3">
      {/* Progress overview */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {queueStatus.isProcessing ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : queueStatus.pending > 0 ? (
              <Clock className="w-5 h-5 text-yellow-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <div>
              <p className="font-medium">
                {queueStatus.isProcessing
                  ? "Enhancing wines..."
                  : queueStatus.pending > 0
                    ? "Wines queued for enhancement"
                    : "Enhancement complete"}
              </p>
              <p className="text-sm text-muted-foreground">
                {queueStatus.completed} completed {" "}
                {queueStatus.pending} pending
                {queueStatus.working > 0 &&
                  ` ${queueStatus.working} processing`}
                {queueStatus.failed > 0 &&
                  ` ${queueStatus.failed} failed`}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        {queueStatus.total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>
                {Math.round(
                  (queueStatus.completed / queueStatus.total) * 100,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(queueStatus.completed / queueStatus.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recently completed wines */}
      {queueStatus.recentlyCompleted.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h5 className="font-medium text-sm mb-2">
            Recently Enhanced
          </h5>
          <div className="space-y-1">
            {queueStatus.recentlyCompleted
              .slice(0, 3)
              .map((wine, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground"
                >
                  {wine.producer_name} - {wine.wine_name}
                </p>
              ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {queueStatus.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h5 className="font-medium text-sm mb-2">
            Recent Errors
          </h5>
          <div className="space-y-1">
            {queueStatus.errors.slice(0, 2).map((error, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {error.producer_name} - {error.wine_name}:{" "}
                {error.error_message}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Hooks --

function useQueueStatus() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: statusCounts } = await supabase
      .from("wines_added_queue")
      .select("status")
      .eq("user_id", user.id);

    if (!statusCounts) return null;

    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const pending = counts.pending || 0;
    const working = counts.working || 0;
    const completed = counts.completed || 0;
    const failed = counts.failed || 0;
    const total = pending + working + completed + failed;

    // Get recently completed wines
    const { data: recentlyCompleted } = await supabase
      .from("wines_added_queue")
      .select("processed_data, processed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("processed_at", { ascending: false })
      .limit(5);

    // Get recent errors
    const { data: recentErrors } = await supabase
      .from("wines_added_queue")
      .select("processed_data, error_message")
      .eq("user_id", user.id)
      .not("error_message", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    const status: QueueStatus = {
      pending,
      working,
      completed,
      failed,
      total,
      isProcessing: working > 0,
      recentlyCompleted:
        recentlyCompleted?.map((item) => {
          const data = item.processed_data as {
            wine_name?: string;
            producer_name?: string;
          } | null;
          return {
            wine_name: data?.wine_name || "Unknown Wine",
            producer_name: data?.producer_name || "Unknown Producer",
            completed_at: item.processed_at || "",
          };
        }) || [],
      errors:
        recentErrors?.map((item) => {
          const data = item.processed_data as {
            wine_name?: string;
            producer_name?: string;
          } | null;
          return {
            wine_name: data?.wine_name || "Unknown Wine",
            producer_name: data?.producer_name || "Unknown Producer",
            error_message: item.error_message || "Unknown error",
          };
        }) || [],
    };

    setQueueStatus(status);

    if (!status.isProcessing && status.pending === 0 && status.total > 0) {
      toast.success("Wine enhancement complete!", {
        description: `Enhanced ${status.completed} wines with AI data`,
      });
    }

    return status;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial fetch + Realtime subscription
  useMountEffect(() => {
    fetchQueueStatus();

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("vivino_queue_status")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wines_added_queue",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchQueueStatus();
          },
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  });

  return { queueStatus, fetchQueueStatus };
}

// -- Main component --

export function VivinoMigration() {
  const [isUploading, setIsUploading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [fixResult, setFixResult] = useState<{
    success: boolean;
    enriched?: number;
    skipped?: number;
    queued?: number;
    message: string;
    errors?: string[];
  } | null>(null);

  const { queueStatus, fetchQueueStatus } = useQueueStatus();

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

  const handleFixDatabase = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("enrich-wines", {
        body: { action: "enrich" },
      });

      if (error) {
        throw error;
      }

      setFixResult(data);

      if (data.success && data.enriched > 0) {
        toast.success("Wines enhanced successfully!", {
          description: `${data.enriched} wines have been enriched with AI-powered data.`,
        });
      } else if (data.success && data.enriched === 0) {
        toast.info("Database is already enhanced", {
          description: data.message || "No wines needed enhancement",
        });
      } else {
        toast.warning("Some wines could not be enhanced", {
          description: data.message || "Please try again",
        });
      }

      await fetchQueueStatus();
    } catch (error) {
      console.error("Database enrichment error:", error);
      toast.error("Failed to enrich wines", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsFixing(false);
    }
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
                    &rarr; Account Settings &rarr; Privacy &rarr; Request a copy of your data
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

          <FileUploadZone
            file={file}
            dragActive={dragActive}
            isUploading={isUploading}
            onDrag={handleDrag}
            onDrop={handleDrop}
            onChange={handleChange}
          />

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

      {result && <MigrationResults result={result} onReset={reset} />}

      {/* Database enhancement section */}
      <div className="mt-8 pt-8 border-t">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Enhance Your Wine Database
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Use AI to automatically fill in missing information about your
              wines, including regions, alcohol content, tasting notes, and food
              pairings.
            </p>
          </div>

          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-green-500 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium">What this does:</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>
                      Identifies wines with missing region or country data
                    </li>
                    <li>Adds typical alcohol content (ABV) for each wine</li>
                    <li>
                      Generates tasting notes based on wine characteristics
                    </li>
                    <li>Suggests food pairings and serving temperatures</li>
                    <li>Enriches producer information with proper regions</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> This process uses OpenAI to analyze
                  your wine data. Wines are processed in the background, so you
                  can leave this page while enhancement continues.
                </p>
              </div>

              {queueStatus && <EnhancementStatus queueStatus={queueStatus} onRefresh={fetchQueueStatus} />}

              {/* Legacy fix result for immediate feedback */}
              {fixResult && !queueStatus?.total && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {fixResult.queued && fixResult.queued > 0
                          ? "Wines Queued for Enhancement"
                          : "No Enhancement Needed"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {fixResult.queued && fixResult.queued > 0
                          ? `${fixResult.queued} wines queued for processing`
                          : fixResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleFixDatabase}
                disabled={
                  isFixing ||
                  (queueStatus?.isProcessing && queueStatus.pending > 0)
                }
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-12 px-6"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Queuing wines for enhancement...
                  </>
                ) : queueStatus?.isProcessing && queueStatus.pending > 0 ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enhancement in progress...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Enrich Wines with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
