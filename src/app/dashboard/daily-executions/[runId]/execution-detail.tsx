"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  CircleDashed,
} from "lucide-react";
import {
  environmentBadgeClass,
  sourceBadgeClass,
  resultBadgeClass,
  priorityBadgeClass,
} from "@/lib/badge-variants";

type ResultStatus = "passed" | "failed" | "flaky" | "skipped" | "not_run";

interface TestCase {
  id: string;
  title: string;
  priority: string;
}

interface ExecutionResult {
  id: string;
  run_id: string;
  test_case_id: string;
  result: ResultStatus;
  comment: string | null;
  duration_ms: number | null;
  error_summary: string | null;
  test_cases: TestCase | null;
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
}

interface Summary {
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  not_run: number;
  total: number;
  passRate: number;
}

interface ExecutionDetailProps {
  run: ExecutionRun;
  results: ExecutionResult[];
  summary: Summary;
}

const filterOptions: { key: ResultStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
  { key: "flaky", label: "Flaky" },
  { key: "skipped", label: "Skipped" },
  { key: "not_run", label: "Not Run" },
];

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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const resultIcons: Record<ResultStatus, React.ElementType> = {
  passed: CheckCircle2,
  failed: XCircle,
  flaky: AlertTriangle,
  skipped: SkipForward,
  not_run: CircleDashed,
};

export function ExecutionDetail({
  run,
  results: initialResults,
  summary: initialSummary,
}: ExecutionDetailProps) {
  const [results, setResults] = useState(initialResults);
  const [summary, setSummary] = useState(initialSummary);
  const [activeFilter, setActiveFilter] = useState<ResultStatus | "all">("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentValue, setCommentValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Recalculate summary from current results
  function recalcSummary(currentResults: ExecutionResult[]) {
    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, not_run: 0 };
    currentResults.forEach((r) => {
      const key = r.result as keyof typeof counts;
      if (key in counts) counts[key]++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const executed = counts.passed + counts.failed + counts.flaky;
    const passRate =
      executed > 0 ? Math.round((counts.passed / executed) * 100) : 0;
    setSummary({ ...counts, total, passRate });
  }

  // Update result status
  async function handleStatusChange(resultId: string, newStatus: ResultStatus) {
    const { error } = await supabase
      .from("daily_execution_results")
      .update({ result: newStatus })
      .eq("id", resultId);

    if (error) {
      setError(error.message);
      return;
    }

    const updated = results.map((r) =>
      r.id === resultId ? { ...r, result: newStatus } : r
    );
    setResults(updated);
    recalcSummary(updated);
  }

  // Save comment
  async function handleSaveComment(resultId: string) {
    const { error } = await supabase
      .from("daily_execution_results")
      .update({ comment: commentValue.trim() || null })
      .eq("id", resultId);

    if (error) {
      setError(error.message);
      return;
    }

    setResults((prev) =>
      prev.map((r) =>
        r.id === resultId ? { ...r, comment: commentValue.trim() || null } : r
      )
    );
    setEditingComment(null);
    setCommentValue("");
  }

  // Delete run
  async function handleDelete() {
    setDeleting(true);

    // Delete results first (foreign key)
    await supabase
      .from("daily_execution_results")
      .delete()
      .eq("run_id", run.id);

    const { error } = await supabase
      .from("daily_execution_runs")
      .delete()
      .eq("id", run.id);

    if (error) {
      setError(error.message);
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }

    router.push("/dashboard/daily-executions");
    router.refresh();
  }

  const filteredResults =
    activeFilter === "all"
      ? results
      : results.filter((r) => r.result === activeFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/daily-executions"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to executions
          </Link>
          <h1 className="text-2xl font-bold">{formatDate(run.run_date)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={environmentBadgeClass[run.environment] ?? ""}
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
            <p className="text-sm text-muted-foreground">{run.notes}</p>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete Run
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => setActiveFilter("all")}
          className="text-left"
        >
          <Card
            size="sm"
            className={`transition-colors cursor-pointer hover:bg-muted/30 ${
              activeFilter === "all" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardContent>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => setActiveFilter("passed")}
          className="text-left"
        >
          <Card
            size="sm"
            className={`transition-colors cursor-pointer hover:bg-muted/30 ${
              activeFilter === "passed" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardContent>
              <p className="text-xs text-muted-foreground">Passed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.passed}
              </p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => setActiveFilter("failed")}
          className="text-left"
        >
          <Card
            size="sm"
            className={`transition-colors cursor-pointer hover:bg-muted/30 ${
              activeFilter === "failed" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardContent>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.failed}
              </p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => setActiveFilter("flaky")}
          className="text-left"
        >
          <Card
            size="sm"
            className={`transition-colors cursor-pointer hover:bg-muted/30 ${
              activeFilter === "flaky" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardContent>
              <p className="text-xs text-muted-foreground">Flaky</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.flaky}
              </p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => setActiveFilter("not_run")}
          className="text-left"
        >
          <Card
            size="sm"
            className={`transition-colors cursor-pointer hover:bg-muted/30 ${
              activeFilter === "not_run" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardContent>
              <p className="text-xs text-muted-foreground">Not Run</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {summary.not_run}
              </p>
            </CardContent>
          </Card>
        </button>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
            <p
              className={`text-2xl font-bold ${passRateColor(
                summary.passRate
              )}`}
            >
              {summary.passRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === opt.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Case</TableHead>
              <TableHead className="w-28">Priority</TableHead>
              <TableHead className="w-36">Result</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead className="w-48">Error Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No results matching this filter
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((result) => {
                const Icon = resultIcons[result.result];
                return (
                  <TableRow key={result.id}>
                    {/* Test Case Title */}
                    <TableCell className="font-medium max-w-xs">
                      <span className="line-clamp-2 whitespace-normal">
                        {result.test_cases?.title ?? "Unknown test case"}
                      </span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      {result.test_cases?.priority && (
                        <Badge
                          variant="secondary"
                          className={
                            priorityBadgeClass[result.test_cases.priority] ?? ""
                          }
                        >
                          {result.test_cases.priority}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Result status dropdown */}
                    <TableCell>
                      <select
                        value={result.result}
                        onChange={(e) =>
                          handleStatusChange(
                            result.id,
                            e.target.value as ResultStatus
                          )
                        }
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border outline-none cursor-pointer transition-colors ${
                          resultBadgeClass[result.result] ?? ""
                        }`}
                      >
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                        <option value="flaky">Flaky</option>
                        <option value="skipped">Skipped</option>
                        <option value="not_run">Not Run</option>
                      </select>
                    </TableCell>

                    {/* Comment (editable inline) */}
                    <TableCell className="max-w-xs">
                      {editingComment === result.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={commentValue}
                            onChange={(e) => setCommentValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveComment(result.id);
                              }
                              if (e.key === "Escape") {
                                setEditingComment(null);
                                setCommentValue("");
                              }
                            }}
                            className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
                          />
                          <Button
                            size="xs"
                            onClick={() => handleSaveComment(result.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setEditingComment(null);
                              setCommentValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingComment(result.id);
                            setCommentValue(result.comment ?? "");
                          }}
                          className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-normal line-clamp-2 w-full"
                        >
                          {result.comment || (
                            <span className="italic opacity-50">
                              Add comment...
                            </span>
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* Error summary */}
                    <TableCell className="max-w-[12rem]">
                      {result.error_summary && (
                        <span className="text-xs text-red-600 dark:text-red-400 whitespace-normal line-clamp-2">
                          {result.error_summary}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Execution Run</DialogTitle>
            <DialogDescription>
              This will permanently delete this execution run and all its
              results. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
