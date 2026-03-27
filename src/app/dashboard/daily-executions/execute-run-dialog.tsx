"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  ExternalLink,
  GitBranch,
  Wifi,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────── */

type Workflow = "hybrid" | "school";
type TestSelection = "all" | "specific";
type Environment = "DEV" | "QA";

interface RecentRun {
  id: number;
  name: string;
  conclusion: string | null;
  status: string;
  head_branch: string;
  created_at: string;
  html_url: string;
}

const ENV_URLS: Record<Environment, string> = {
  DEV: "https://app.dev.circathera.com/login",
  QA: "https://app.circathera.com/login",
};

/* ─── Helpers ────────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function conclusionColor(conclusion: string | null, status: string): string {
  if (!conclusion) {
    if (status === "in_progress") return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800";
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
  }
  if (conclusion === "success") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
  if (conclusion === "failure") return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
}

function conclusionText(conclusion: string | null, status: string): string {
  if (!conclusion) {
    if (status === "in_progress") return "Running";
    if (status === "queued") return "Queued";
    return "Pending";
  }
  if (conclusion === "success") return "Passed";
  if (conclusion === "failure") return "Failed";
  if (conclusion === "cancelled") return "Cancelled";
  return conclusion;
}

function conclusionIcon(conclusion: string | null, status: string) {
  if (!conclusion) {
    if (status === "in_progress") return <RotateCw className="h-3 w-3 animate-spin" />;
    return <Clock className="h-3 w-3" />;
  }
  if (conclusion === "success") return <CheckCircle2 className="h-3 w-3" />;
  if (conclusion === "failure") return <XCircle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

/* ─── Toggle Button Group ────────────────────────────────────── */

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export function ExecuteRunDialog() {
  // Form state
  const [workflow, setWorkflow] = useState<Workflow>("hybrid");
  const [testSelection, setTestSelection] = useState<TestSelection>("all");
  const [testSpec, setTestSpec] = useState("");
  const [environment, setEnvironment] = useState<Environment>("DEV");
  const [branch, setBranch] = useState("main");
  const [sendSlack, setSendSlack] = useState(true);

  // UI state
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<"success" | "error" | null>(null);
  const [triggerError, setTriggerError] = useState("");

  // Recent runs
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  const fetchRecentRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch("/api/github/recent-runs");
      if (res.ok) {
        const data = await res.json();
        setRecentRuns(data.runs ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentRuns();
  }, [fetchRecentRuns]);

  async function handleTrigger() {
    setTriggering(true);
    setTriggerResult(null);
    setTriggerError("");

    try {
      const res = await fetch("/api/github/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow,
          branch,
          baseUrl: ENV_URLS[environment],
          testSpec: testSelection === "specific" ? testSpec : undefined,
          sendSlack,
        }),
      });

      if (res.ok) {
        setTriggerResult("success");
        // Auto-refresh recent runs after a short delay to give GitHub time
        setTimeout(() => fetchRecentRuns(), 3000);
      } else {
        const data = await res.json();
        setTriggerResult("error");
        setTriggerError(data.error ?? "Failed to trigger workflow");
      }
    } catch (err) {
      setTriggerResult("error");
      setTriggerError(err instanceof Error ? err.message : "Network error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm">
            <Play className="h-3.5 w-3.5" />
            Execute Run
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Execute CI Run
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Configure CI Run ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Configure CI Run
            </h3>

            {/* Workflow */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Workflow
              </label>
              <ToggleGroup
                options={[
                  { label: "Hybrid", value: "hybrid" as Workflow },
                  { label: "School", value: "school" as Workflow },
                ]}
                value={workflow}
                onChange={setWorkflow}
              />
            </div>

            {/* Test Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Test Selection
              </label>
              <ToggleGroup
                options={[
                  { label: "All Tests", value: "all" as TestSelection },
                  { label: "Specific File", value: "specific" as TestSelection },
                ]}
                value={testSelection}
                onChange={setTestSelection}
              />
              {testSelection === "specific" ? (
                <Input
                  placeholder="e.g. tests/login.spec.ts"
                  value={testSpec}
                  onChange={(e) => setTestSpec(e.target.value)}
                  className="mt-2"
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  All tests in the selected workflow will run.
                </p>
              )}
            </div>

            {/* Environment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Environment
              </label>
              <ToggleGroup
                options={[
                  { label: "DEV", value: "DEV" as Environment },
                  { label: "QA", value: "QA" as Environment },
                ]}
                value={environment}
                onChange={setEnvironment}
              />
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {ENV_URLS[environment]}
              </p>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Branch
              </label>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>

            {/* Slack notification */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendSlack}
                onChange={(e) => setSendSlack(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm">Send Slack notification with test results</span>
            </label>

            {/* Trigger button */}
            <Button
              className="w-full"
              onClick={handleTrigger}
              disabled={triggering || (testSelection === "specific" && !testSpec.trim())}
            >
              {triggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Trigger CI
                </>
              )}
            </Button>

            {/* Result feedback */}
            {triggerResult === "success" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Workflow triggered successfully! It may take a moment to appear in recent runs.
              </div>
            )}
            {triggerResult === "error" && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                <XCircle className="h-4 w-4 shrink-0" />
                {triggerError}
              </div>
            )}
          </section>

          {/* ── CI Status ── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              CI Status
            </h3>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                >
                  <Wifi className="h-3 w-3" />
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  circathera/aba-qa-automation
                </span>
              </div>
              <a
                href="https://github.com/CircaThera/aba-qa-automation/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View GitHub Actions
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* ── Recent CI Runs ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent CI Runs
              </h3>
              <button
                type="button"
                onClick={fetchRecentRuns}
                disabled={loadingRuns}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn("h-4 w-4", loadingRuns && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-2">
              {loadingRuns && recentRuns.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading recent runs...
                </div>
              ) : recentRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent runs found.
                </p>
              ) : (
                recentRuns.map((run) => (
                  <a
                    key={run.id}
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {conclusionIcon(run.conclusion, run.status)}
                      <span className="text-sm font-medium truncate">
                        {run.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {run.head_branch}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full border text-xs",
                          conclusionColor(run.conclusion, run.status)
                        )}
                      >
                        {conclusionText(run.conclusion, run.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {relativeTime(run.created_at)}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
