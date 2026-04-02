"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Zap,
  GitBranch,
  Activity,
  TrendingUp,
  Filter,
  RotateCw,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  conclusionBadgeClass,
  tenantBadgeClass,
  triggerBadgeClass,
  sourceBadgeClass,
} from "@/lib/badge-variants";
import { cn } from "@/lib/utils";
import { ExecuteRunDialog } from "./execute-run-dialog";
import type { GroupedRuns, WorkflowRun } from "./page";

/* ─── Helpers ─────────────────────────────────────────────────── */

function extractTenant(name: string): "Hybrid" | "School" | "Unknown" {
  if (name.toLowerCase().includes("hybrid")) return "Hybrid";
  if (name.toLowerCase().includes("school")) return "School";
  return "Unknown";
}

function triggerLabel(event: string): string {
  if (event === "schedule") return "Scheduled";
  if (event === "workflow_dispatch") return "Manual Trigger";
  return event;
}

function conclusionLabel(conclusion: string | null, status: string): string {
  if (!conclusion) {
    if (status === "in_progress") return "Running";
    if (status === "queued") return "Queued";
    return "Pending";
  }
  if (conclusion === "success") return "Passed";
  if (conclusion === "failure") return "Failed";
  if (conclusion === "cancelled") return "Cancelled";
  if (conclusion === "timed_out") return "Timed Out";
  return conclusion;
}

function conclusionIcon(conclusion: string | null, status: string) {
  if (!conclusion) {
    if (status === "in_progress") return <RotateCw className="h-3.5 w-3.5 animate-spin" />;
    return <Clock className="h-3.5 w-3.5" />;
  }
  if (conclusion === "success") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (conclusion === "failure") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function conclusionBorder(conclusion: string | null): string {
  if (conclusion === "success") return "border-l-emerald-500";
  if (conclusion === "failure") return "border-l-red-500";
  return "border-l-slate-300 dark:border-l-slate-600";
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ─── Props ───────────────────────────────────────────────────── */

interface ExecutionsListProps {
  grouped: GroupedRuns[];
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

/* ─── Run Card ────────────────────────────────────────────────── */

function RunCard({ run, onDelete, deleting }: { run: WorkflowRun; onDelete: (id: number) => void; deleting: boolean }) {
  const tenant = extractTenant(run.name);
  const trigger = triggerLabel(run.event);
  const cLabel = conclusionLabel(run.conclusion, run.status);
  const cIcon = conclusionIcon(run.conclusion, run.status);
  const border = conclusionBorder(run.conclusion);
  const badgeKey = run.conclusion ?? "cancelled";

  return (
    <Card className={cn("border-l-4 transition-all duration-200 hover:shadow-md", border)}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left section */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full font-semibold",
                run.event === "schedule"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"
              )}
            >
              {run.event === "schedule" ? "DEV" : "QA"}
            </Badge>
            {tenant !== "Unknown" && (
              <Badge variant="secondary" className={tenantBadgeClass[tenant]}>
                {tenant}
              </Badge>
            )}
            <Badge variant="secondary" className={sourceBadgeClass}>
              CI / GitHub Actions
            </Badge>
            <Badge variant="secondary" className={triggerBadgeClass[run.event] ?? triggerBadgeClass.schedule}>
              {trigger}
            </Badge>
          </div>

          {/* Run info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{formatShortDate(run.created_at)}</span>
            {run.test_total > 0 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>{run.test_total} tests</span>
              </>
            )}
            <span className="text-muted-foreground/50">|</span>
            <Timer className="h-3.5 w-3.5 shrink-0" />
            <span>{formatTime(run.created_at)}</span>
          </div>

          {/* Branch + run number */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="font-mono">{run.head_branch}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Run #{run.run_number}</span>
            {run.run_attempt > 1 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>Attempt #{run.run_attempt}</span>
              </>
            )}
          </div>
        </div>

        {/* Right section: test counts + conclusion + link */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Test counts */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">{run.test_passed}</span>
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span className="font-semibold">{run.test_failed}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">{run.test_flaky}</span>
            </span>
          </div>

          {/* Pass rate badge */}
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full px-3 font-semibold",
              run.pass_rate >= 90
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                : run.pass_rate >= 70
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            )}
          >
            {run.pass_rate}% pass
          </Badge>

          <Link href={`/dashboard/daily-executions/${run.id}`}>
            <Button variant="outline" size="sm">
              View Details
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(run.id)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

export function ExecutionsList({
  grouped,
  totalRuns,
  successCount,
  failureCount,
  successRate,
}: ExecutionsListProps) {
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteRun = useCallback(async (runId: number) => {
    if (!confirm("Are you sure you want to delete this run? This cannot be undone.")) return;
    setDeletingId(runId);
    try {
      const res = await fetch(`/api/github/runs/${runId}`, { method: "DELETE" });
      if (res.ok) {
        setDeletedIds((prev) => new Set(prev).add(runId));
      }
    } catch {
      // keep visible on error
    } finally {
      setDeletingId(null);
    }
  }, []);

  const filteredGrouped = useMemo(() => {
    return grouped
      .map((group) => ({
        ...group,
        runs: group.runs.filter((run) => {
          if (deletedIds.has(run.id)) return false;
          const tenant = extractTenant(run.name);
          if (tenantFilter !== "all" && tenant !== tenantFilter) return false;
          if (triggerFilter !== "all" && run.event !== triggerFilter) return false;
          return true;
        }),
      }))
      .filter((group) => group.runs.length > 0);
  }, [grouped, tenantFilter, triggerFilter, deletedIds]);

  const filteredTotal = filteredGrouped.reduce((acc, g) => acc + g.runs.length, 0);

  const hasActiveFilter = tenantFilter !== "all" || triggerFilter !== "all";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Executions</h1>
            <p className="mt-1 text-muted-foreground">
              Automated test execution results from GitHub Actions
            </p>
          </div>
          <ExecuteRunDialog />
        </div>

        {/* Run groups */}
        <div className="mt-6 flex flex-col gap-8">
          {filteredGrouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <div className="rounded-full bg-muted p-4">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No workflow runs found</h3>
              <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                {hasActiveFilter
                  ? "No runs match the current filters. Try adjusting your filters."
                  : "There are no workflow runs available from the configured GitHub repository."}
              </p>
              {hasActiveFilter && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setTenantFilter("all");
                    setTriggerFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            filteredGrouped.map((group) => (
              <section key={group.date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">
                      {formatDateHeader(group.date)}
                    </h2>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground">
                    {group.runs.length} {group.runs.length === 1 ? "run" : "runs"}
                  </Badge>
                </div>

                {/* Run cards */}
                <div className="flex flex-col gap-3">
                  {group.runs.map((run) => (
                    <RunCard key={run.id} run={run} onDelete={handleDeleteRun} deleting={deletingId === run.id} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:block w-72 shrink-0 space-y-4">
        {/* Execution Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              Execution Summary
            </CardTitle>
            <CardDescription>Last 50 workflow runs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total runs */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Runs</span>
              <span className="text-lg font-bold">{totalRuns}</span>
            </div>

            {/* Success rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <div className="flex items-center gap-1.5">
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    successRate >= 80
                      ? "text-emerald-600"
                      : successRate >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                  )}
                />
                <span
                  className={cn(
                    "text-lg font-bold",
                    successRate >= 80
                      ? "text-emerald-600 dark:text-emerald-400"
                      : successRate >= 50
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  )}
                >
                  {successRate}%
                </span>
              </div>
            </div>

            {/* Success / failure bar */}
            <div className="space-y-1.5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {totalRuns > 0 && (
                  <>
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(successCount / totalRuns) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(failureCount / totalRuns) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {successCount} passed
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {failureCount} failed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-primary" />
              Quick Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Environment
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["all", "Hybrid", "School"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setTenantFilter(value)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      tenantFilter === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {value === "all" ? "All" : value}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Trigger
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "All", value: "all" },
                  { label: "Scheduled", value: "schedule" },
                  { label: "Manual", value: "workflow_dispatch" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTriggerFilter(opt.value)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      triggerFilter === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear all */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setTenantFilter("all");
                  setTriggerFilter("all");
                }}
              >
                Clear all filters
              </Button>
            )}

            {/* Filtered count */}
            {hasActiveFilter && (
              <p className="text-xs text-center text-muted-foreground">
                Showing {filteredTotal} of {totalRuns} runs
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
