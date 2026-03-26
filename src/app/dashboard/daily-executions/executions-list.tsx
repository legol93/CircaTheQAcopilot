"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Plus } from "lucide-react";
import {
  environmentBadgeClass,
  sourceBadgeClass,
} from "@/lib/badge-variants";
import { CreateRunDialog } from "./create-run-dialog";

interface RunStats {
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  not_run: number;
  total: number;
  passRate: number;
}

interface ExecutionRun {
  id: string;
  project_id: string;
  run_date: string;
  created_by: string;
  notes: string | null;
  source: string;
  environment: string;
  run_type: string;
  summary_json: unknown;
  report_url: string | null;
  stats: RunStats;
}

interface ExecutionsListProps {
  projectId: string;
  runs: ExecutionRun[];
}

const runTypeBadgeClass: Record<string, string> = {
  scheduled:
    "rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
  manual:
    "rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
};

function passRateColor(rate: number): string {
  if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ExecutionsList({ projectId, runs }: ExecutionsListProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Executions</h1>
          <p className="mt-1 text-muted-foreground">
            Track daily test execution results across environments
          </p>
        </div>
        {projectId && <CreateRunDialog projectId={projectId} />}
      </div>

      {runs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="rounded-full bg-muted p-4">
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            No execution runs yet
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create your first daily execution run to start tracking test
            results.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/dashboard/daily-executions/${run.id}`}
              className="block"
            >
              <Card
                size="sm"
                className="transition-colors hover:bg-muted/30 cursor-pointer"
              >
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left side: date + badges + notes */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {formatDate(run.run_date)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          environmentBadgeClass[run.environment] ?? ""
                        }
                      >
                        {run.environment}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={sourceBadgeClass[run.source] ?? ""}
                      >
                        {run.source}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={runTypeBadgeClass[run.run_type] ?? ""}
                      >
                        {run.run_type}
                      </Badge>
                    </div>
                    {run.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {run.notes}
                      </p>
                    )}
                  </div>

                  {/* Right side: stats */}
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {run.stats.passed} passed
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {run.stats.failed} failed
                    </span>
                    {run.stats.flaky > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {run.stats.flaky} flaky
                      </span>
                    )}
                    {run.stats.skipped > 0 && (
                      <span className="text-muted-foreground">
                        {run.stats.skipped} skipped
                      </span>
                    )}
                    <span
                      className={`font-semibold ${passRateColor(
                        run.stats.passRate
                      )}`}
                    >
                      {run.stats.passRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
