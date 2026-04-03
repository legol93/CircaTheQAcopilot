"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCw,
  ChevronDown,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { TestResult, FailureDetail } from "./page";

interface RunInfo {
  id: number;
  name: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
  head_branch: string;
  run_number: number;
}

interface Summary {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  passRate: number;
}

interface RunDetailProps {
  run: RunInfo;
  tests: TestResult[];
  summary: Summary;
}

type FilterType = "all" | "passed" | "failed" | "flaky";

const statusIcon: Record<string, React.ReactNode> = {
  passed: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  flaky: <AlertTriangle className="h-5 w-5 text-amber-600" />,
};

const statusBorder: Record<string, string> = {
  passed: "border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10",
  failed: "border-l-red-400 bg-red-50/30 dark:bg-red-950/10",
  flaky: "border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10",
};

const statusBadge: Record<string, string> = {
  passed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  flaky: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function RunDetail({ run, tests, summary }: RunDetailProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  const filteredTests = useMemo(() => {
    if (filter === "all") return tests;
    return tests.filter((t) => t.status === filter);
  }, [tests, filter]);

  // Only show individual test cards for failed and flaky (we don't have passed test names)
  const displayTests = useMemo(() => {
    if (filter === "passed") {
      return []; // We don't have individual passed test names
    }
    if (filter === "all") {
      // Show failed and flaky first, then a summary for passed
      return tests.filter((t) => t.status !== "passed");
    }
    return filteredTests;
  }, [tests, filteredTests, filter]);

  function toggleExpand(idx: number) {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const isCreatedBy = run.event === "workflow_dispatch" ? "Manual Trigger" : "GitHub Actions";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/daily-executions">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Executions
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <a href={run.html_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              View on GitHub
            </Button>
          </a>
        </div>
      </div>

      {/* Run info card */}
      <Card className="mt-4">
        <CardContent className="py-6">
          <h1 className="text-2xl font-bold">{formatDate(run.created_at)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {isCreatedBy} at {formatTime(run.created_at)}
          </p>

          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-5 gap-3">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-xl border-2 p-4 text-center transition-all",
                filter === "all" ? "border-primary shadow-sm" : "border-border hover:border-muted-foreground/30"
              )}
            >
              <p className="text-3xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </button>
            <button
              onClick={() => setFilter("passed")}
              className={cn(
                "rounded-xl border-2 p-4 text-center transition-all",
                filter === "passed" ? "border-emerald-500 shadow-sm" : "border-border hover:border-emerald-300"
              )}
            >
              <p className="text-3xl font-bold text-emerald-600">{summary.passed}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={cn(
                "rounded-xl border-2 p-4 text-center transition-all",
                filter === "failed" ? "border-red-500 shadow-sm" : "border-border hover:border-red-300"
              )}
            >
              <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </button>
            <button
              onClick={() => setFilter("flaky")}
              className={cn(
                "rounded-xl border-2 p-4 text-center transition-all",
                filter === "flaky" ? "border-amber-500 shadow-sm" : "border-border hover:border-amber-300"
              )}
            >
              <p className="text-3xl font-bold text-amber-600">{summary.flaky}</p>
              <p className="text-xs text-muted-foreground">Flaky</p>
            </button>
            <div className="rounded-xl border-2 border-border p-4 text-center">
              <p className={cn(
                "text-3xl font-bold",
                summary.passRate >= 90 ? "text-emerald-600" :
                  summary.passRate >= 70 ? "text-amber-600" : "text-red-600"
              )}>
                ~{summary.passRate}%
              </p>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="mt-6 flex items-center gap-2">
        {([
          { key: "all" as FilterType, label: "All", count: summary.total },
          { key: "passed" as FilterType, label: "Passed", count: summary.passed, color: "text-emerald-600" },
          { key: "failed" as FilterType, label: "Failed", count: summary.failed, color: "text-red-600" },
          { key: "flaky" as FilterType, label: "Flaky", count: summary.flaky, color: "text-amber-600" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              filter === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            {tab.key === "passed" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {tab.key === "failed" && <XCircle className="h-3.5 w-3.5" />}
            {tab.key === "flaky" && <AlertTriangle className="h-3.5 w-3.5" />}
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Test results */}
      <div className="mt-4 flex flex-col gap-2">
        {filter === "passed" && (
          <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">{summary.passed} tests passed</p>
                  <p className="text-sm text-muted-foreground">
                    All passing tests completed successfully
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {displayTests.map((test, idx) => (
          <Card
            key={`${test.status}-${idx}`}
            className={cn("border-l-4 transition-all", statusBorder[test.status])}
          >
            <CardContent className="py-3">
              <button
                onClick={() => toggleExpand(idx)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {statusIcon[test.status]}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">
                        TC-{String(idx + 1).padStart(3, "0")}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs rounded-full", statusBadge[test.status])}
                      >
                        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-medium">{test.name}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {test.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration}
                        </span>
                      )}
                      {test.retries && test.retries > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <RotateCw className="h-3 w-3" />
                          {test.retries} {test.retries === 1 ? "retry" : "retries"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expandedTests.has(idx) && "rotate-180"
                  )}
                />
              </button>

              {expandedTests.has(idx) && (
                <div className="mt-3 space-y-2">
                  {test.file && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {test.file}
                      </p>
                    </div>
                  )}
                  {test.errors && test.errors.length > 0 && (
                    <div className="space-y-2">
                      {test.errors.map((err, errIdx) => (
                        <div
                          key={errIdx}
                          className="rounded-md border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20"
                        >
                          <p className="flex items-center gap-1.5 text-xs font-mono text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3 shrink-0" />
                            {err.file}:{err.line}
                          </p>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {err.message}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                  {!test.file && (!test.errors || test.errors.length === 0) && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        No additional details available
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filter === "all" && summary.passed > 0 && (
          <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">{summary.passed} tests passed</p>
                  <p className="text-sm text-muted-foreground">
                    All other tests completed successfully
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {displayTests.length === 0 && filter !== "passed" && (
          <div className="py-12 text-center text-muted-foreground">
            No {filter} tests in this run
          </div>
        )}
      </div>
    </div>
  );
}
