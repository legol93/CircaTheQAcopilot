"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Upload,
  Video,
  Image as ImageIcon,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestWithAiProps {
  testCaseId: string;
  testTitle: string;
  steps: { step_number: number; action: string; expected_result: string }[];
}

interface AiResult {
  verdict: "pass" | "fail" | "inconclusive";
  summary: string;
  step_results: {
    step_number: number;
    status: "pass" | "fail" | "inconclusive";
    observation: string;
  }[];
  recommendations?: string;
}

export function TestWithAi({ testCaseId, testTitle, steps }: TestWithAiProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const accepted = Array.from(e.dataTransfer.files).filter(
      (f) => f.size <= 10 * 1024 * 1024 &&
        (f.type.startsWith("image/") || f.type.startsWith("video/"))
    );
    setFiles((prev) => [...prev, ...accepted]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const accepted = Array.from(e.target.files ?? []).filter(
      (f) => f.size <= 10 * 1024 * 1024 &&
        (f.type.startsWith("image/") || f.type.startsWith("video/"))
    );
    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleAnalyze() {
    if (files.length === 0) {
      setError("Please upload at least one image or video as evidence");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Convert files to base64
      const evidenceData = await Promise.all(
        files.filter(f => f.type.startsWith("image/")).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          return {
            type: "image" as const,
            media_type: file.type,
            data: base64,
            name: file.name,
          };
        })
      );

      const res = await fetch("/api/ai/test-with-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId,
          testTitle,
          steps,
          evidence: evidenceData,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setFiles([]);
    setNotes("");
    setResult(null);
    setError(null);
    setStepsExpanded(false);
  }

  const verdictConfig = {
    pass: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "PASSED" },
    fail: { icon: <XCircle className="h-5 w-5" />, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "FAILED" },
    inconclusive: { icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "INCONCLUSIVE" },
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Test with AI
          </Button>
        }
      />
      <DialogContent style={{ maxWidth: "700px", width: "90vw" }} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-600" />
            Test with AI
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload screenshots or videos as evidence. AI will analyze them against the test steps.
          </p>
        </DialogHeader>

        {!result ? (
          /* ── Upload Form ── */
          <div className="mt-3 flex flex-col gap-4">
            {/* Test Steps Context */}
            <div className="rounded-lg border bg-muted/20">
              <button
                onClick={() => setStepsExpanded(!stepsExpanded)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Test Steps Context</span>
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {steps.length} steps
                  </Badge>
                </div>
                {stepsExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {stepsExpanded && (
                <div className="border-t px-4 py-3 space-y-2">
                  {steps.map((s) => (
                    <div key={s.step_number} className="flex gap-2 text-xs">
                      <span className="shrink-0 font-bold text-primary">{s.step_number}.</span>
                      <div>
                        <span className="font-medium">{s.action}</span>
                        <span className="text-muted-foreground"> → {s.expected_result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence Upload */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">Evidence Upload</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-8 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/20"
              >
                <div className="flex items-center gap-3 text-muted-foreground/60">
                  <Upload className="h-6 w-6" />
                  <Video className="h-6 w-6" />
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop, click to select, or paste from clipboard
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Images: PNG, JPG, WEBP · Videos: MP4, MOV, WebM · Max 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Video className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <span className="text-muted-foreground">
                        ({(file.size / 1024).toFixed(0)}KB)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context for the AI analysis..."
                rows={3}
              />
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || files.length === 0}
                className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
              >
                {analyzing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Analyze Evidence</>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Results ── */
          <div className="mt-3 flex flex-col gap-4">
            {/* Verdict */}
            <div className={cn("flex items-center gap-3 rounded-lg border p-4", verdictConfig[result.verdict].bg)}>
              <span className={verdictConfig[result.verdict].color}>{verdictConfig[result.verdict].icon}</span>
              <div>
                <p className={cn("text-lg font-bold", verdictConfig[result.verdict].color)}>
                  {verdictConfig[result.verdict].label}
                </p>
                <p className="text-sm">{result.summary}</p>
              </div>
            </div>

            {/* Step results */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Step-by-Step Analysis</h3>
              {result.step_results.map((sr) => (
                <div
                  key={sr.step_number}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    sr.status === "pass" ? "border-emerald-200 bg-emerald-50/30" :
                    sr.status === "fail" ? "border-red-200 bg-red-50/30" :
                    "border-amber-200 bg-amber-50/30"
                  )}
                >
                  <span className={cn(
                    "mt-0.5",
                    sr.status === "pass" ? "text-emerald-600" :
                    sr.status === "fail" ? "text-red-600" : "text-amber-600"
                  )}>
                    {sr.status === "pass" ? <CheckCircle2 className="h-4 w-4" /> :
                     sr.status === "fail" ? <XCircle className="h-4 w-4" /> :
                     <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Step {sr.step_number}</p>
                    <p className="text-sm">{sr.observation}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.recommendations && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.recommendations}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setResult(null); }}>Test Again</Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
