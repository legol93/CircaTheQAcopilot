"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  MinusCircle,
  Trash2,
  CheckCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { runStatusBadgeClass, priorityBadgeClass } from "@/lib/badge-variants";
import type {
  TestRun,
  TestRunResult,
  TestCase,
  ResultStatus,
  Priority,
  Status,
} from "@/types/database";

type ResultWithCase = TestRunResult & {
  test_cases: {
    id: string;
    title: string;
    priority: Priority;
    status: Status;
  };
};

interface RunDetailProps {
  run: TestRun;
  initialResults: ResultWithCase[];
  suites: { id: string; name: string }[];
  userId: string;
}

type FilterType = "all" | ResultStatus;

const resultStatusIcon: Record<ResultStatus, React.ReactNode> = {
  not_run: <MinusCircle className="h-5 w-5 text-slate-500" />,
  passed: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  blocked: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  skipped: <SkipForward className="h-5 w-5 text-blue-600" />,
};

const resultStatusBadgeClass: Record<ResultStatus, string> = {
  not_run:
    "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  passed:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300",
  failed:
    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-300",
  blocked:
    "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-300",
  skipped:
    "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
};

const resultStatusLabel: Record<ResultStatus, string> = {
  not_run: "Not Run",
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  skipped: "Skipped",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RunDetail({ run: initialRun, initialResults, suites, userId }: RunDetailProps) {
  const [run, setRun] = useState(initialRun);
  const [results, setResults] = useState(initialResults);
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addCasesOpen, setAddCasesOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Calculate summary stats
  const summary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const blocked = results.filter((r) => r.status === "blocked").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const notRun = results.filter((r) => r.status === "not_run").length;
    const completed = total - notRun;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      passed,
      failed,
      blocked,
      skipped,
      notRun,
      completed,
      completionPercentage,
    };
  }, [results]);

  // Filter results
  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.status === filter);
  }, [results, filter]);

  // Start run
  async function handleStartRun() {
    const { error } = await supabase
      .from("test_runs")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (!error) {
      setRun((prev) => ({
        ...prev,
        status: "in_progress",
        started_at: new Date().toISOString(),
      }));
      router.refresh();
    }
  }

  // Complete run
  async function handleCompleteRun() {
    const { error } = await supabase
      .from("test_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (!error) {
      setRun((prev) => ({
        ...prev,
        status: "completed",
        completed_at: new Date().toISOString(),
      }));
      router.refresh();
    }
  }

  // Delete run
  async function handleDeleteRun() {
    const { error } = await supabase.from("test_runs").delete().eq("id", run.id);
    if (!error) {
      router.push("/dashboard/runs");
    }
  }

  // Update result status
  const updateResultStatus = useCallback(
    async (resultId: string, newStatus: ResultStatus) => {
      const { error } = await supabase
        .from("test_run_results")
        .update({
          status: newStatus,
          executed_by: userId,
          executed_at: new Date().toISOString(),
        })
        .eq("id", resultId);

      if (!error) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId
              ? {
                  ...r,
                  status: newStatus,
                  executed_by: userId,
                  executed_at: new Date().toISOString(),
                }
              : r
          )
        );
      }
    },
    [supabase, userId]
  );

  // Update notes
  const updateNotes = useCallback(
    async (resultId: string, notes: string) => {
      const { error } = await supabase
        .from("test_run_results")
        .update({ notes: notes.trim() || null })
        .eq("id", resultId);

      if (!error) {
        setResults((prev) =>
          prev.map((r) => (r.id === resultId ? { ...r, notes: notes.trim() || null } : r))
        );
      }
    },
    [supabase]
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/runs">
            <Button variant="ghost" size="icon" aria-label="Back to runs">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{run.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Created {formatDate(run.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={runStatusBadgeClass[run.status]}>
            {run.status.replace("_", " ")}
          </Badge>
          {run.status === "pending" && (
            <Button size="sm" onClick={handleStartRun} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Start Run
            </Button>
          )}
          {run.status === "in_progress" && (
            <Button
              size="sm"
              onClick={handleCompleteRun}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Complete Run
            </Button>
          )}
          {run.status !== "completed" && (
            <Button variant="outline" size="sm" onClick={() => setAddCasesOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Test Cases
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-5 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-xl border-2 p-4 text-center transition-all",
            filter === "all"
              ? "border-primary shadow-sm"
              : "border-border hover:border-muted-foreground/30"
          )}
          aria-label="Show all results"
        >
          <p className="text-3xl font-bold">{summary.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </button>
        <button
          onClick={() => setFilter("passed")}
          className={cn(
            "rounded-xl border-2 p-4 text-center transition-all",
            filter === "passed"
              ? "border-emerald-500 shadow-sm"
              : "border-border hover:border-emerald-300"
          )}
          aria-label="Show passed tests"
        >
          <p className="text-3xl font-bold text-emerald-600">{summary.passed}</p>
          <p className="text-xs text-muted-foreground">Passed</p>
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={cn(
            "rounded-xl border-2 p-4 text-center transition-all",
            filter === "failed"
              ? "border-red-500 shadow-sm"
              : "border-border hover:border-red-300"
          )}
          aria-label="Show failed tests"
        >
          <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </button>
        <button
          onClick={() => setFilter("blocked")}
          className={cn(
            "rounded-xl border-2 p-4 text-center transition-all",
            filter === "blocked"
              ? "border-amber-500 shadow-sm"
              : "border-border hover:border-amber-300"
          )}
          aria-label="Show blocked tests"
        >
          <p className="text-3xl font-bold text-amber-600">{summary.blocked}</p>
          <p className="text-xs text-muted-foreground">Blocked</p>
        </button>
        <button
          onClick={() => setFilter("not_run")}
          className={cn(
            "rounded-xl border-2 p-4 text-center transition-all",
            filter === "not_run"
              ? "border-slate-500 shadow-sm"
              : "border-border hover:border-slate-300"
          )}
          aria-label="Show not run tests"
        >
          <p className="text-3xl font-bold text-slate-600">{summary.notRun}</p>
          <p className="text-xs text-muted-foreground">Not Run</p>
        </button>
      </div>

      {/* Progress Bar */}
      <Card className="mt-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm font-medium mb-2">
            <span>Progress</span>
            <span className="text-muted-foreground">
              {summary.completed} / {summary.total} ({summary.completionPercentage}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="flex h-full">
              {summary.passed > 0 && (
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${(summary.passed / summary.total) * 100}%`,
                  }}
                />
              )}
              {summary.failed > 0 && (
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(summary.failed / summary.total) * 100}%`,
                  }}
                />
              )}
              {summary.blocked > 0 && (
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${(summary.blocked / summary.total) * 100}%`,
                  }}
                />
              )}
              {summary.skipped > 0 && (
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${(summary.skipped / summary.total) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="mt-6 flex items-center gap-2">
        {(
          [
            { key: "all" as FilterType, label: "All", count: summary.total },
            { key: "passed" as FilterType, label: "Passed", count: summary.passed },
            { key: "failed" as FilterType, label: "Failed", count: summary.failed },
            { key: "blocked" as FilterType, label: "Blocked", count: summary.blocked },
            { key: "skipped" as FilterType, label: "Skipped", count: summary.skipped },
            { key: "not_run" as FilterType, label: "Not Run", count: summary.notRun },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              filter === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            )}
            aria-label={`Filter by ${tab.label}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="mt-4 flex flex-col gap-3">
        {filteredResults.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No {filter === "all" ? "" : resultStatusLabel[filter]} tests in this run
          </div>
        ) : (
          filteredResults.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              testCase={result.test_cases}
              onStatusChange={updateResultStatus}
              onNotesChange={updateNotes}
            />
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test Run</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{run.name}&quot;? This will also delete all
            results. This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDeleteRun}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Test Cases */}
      <AddTestCasesDialog
        open={addCasesOpen}
        onOpenChange={setAddCasesOpen}
        suites={suites}
        runId={run.id}
        existingCaseIds={results.map((r) => r.test_case_id)}
        onAdded={(newResults) => {
          setResults((prev) => [...prev, ...newResults]);
          router.refresh();
        }}
      />
    </div>
  );
}

/* ─── Result Card ────────────────────────────────────────────── */

interface ResultCardProps {
  result: TestRunResult;
  testCase: {
    id: string;
    title: string;
    priority: Priority;
    status: Status;
  };
  onStatusChange: (resultId: string, status: ResultStatus) => void;
  onNotesChange: (resultId: string, notes: string) => void;
}

function ResultCard({ result, testCase, onStatusChange, onNotesChange }: ResultCardProps) {
  const [notes, setNotes] = useState(result.notes ?? "");
  const [notesExpanded, setNotesExpanded] = useState(false);

  function handleNotesBlur() {
    if (notes !== (result.notes ?? "")) {
      onNotesChange(result.id, notes);
    }
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Test case info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={priorityBadgeClass[testCase.priority]}>
                {testCase.priority}
              </Badge>
              <Badge variant="secondary" className={resultStatusBadgeClass[result.status]}>
                {resultStatusLabel[result.status]}
              </Badge>
            </div>
            <h3 className="font-medium text-base">{testCase.title}</h3>
            {result.executed_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last executed {formatDateTime(result.executed_at)}
              </p>
            )}
          </div>

          {/* Right: Status selector */}
          <div className="flex items-center gap-2">
            <Select
              value={result.status}
              onValueChange={(v) => v && onStatusChange(result.id, v as ResultStatus)}
            >
              <SelectTrigger className="w-fit min-w-[140px]" aria-label="Change test status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_run">
                  <MinusCircle className="mr-2 h-4 w-4 text-slate-500" />
                  Not Run
                </SelectItem>
                <SelectItem value="passed">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                  Passed
                </SelectItem>
                <SelectItem value="failed">
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Failed
                </SelectItem>
                <SelectItem value="blocked">
                  <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
                  Blocked
                </SelectItem>
                <SelectItem value="skipped">
                  <SkipForward className="mr-2 h-4 w-4 text-blue-600" />
                  Skipped
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes section */}
        <div className="mt-3">
          {!notesExpanded && !notes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesExpanded(true)}
              className="text-xs text-muted-foreground"
            >
              Add notes...
            </Button>
          )}
          {(notesExpanded || notes) && (
            <div>
              <label htmlFor={`notes-${result.id}`} className="text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <Textarea
                id={`notes-${result.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes about this test result..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Add Test Cases Dialog ──────────────────────────────────── */

interface AddTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suites: { id: string; name: string }[];
  runId: string;
  existingCaseIds: string[];
  onAdded: (newResults: ResultWithCase[]) => void;
}

interface TestCaseOption {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
}

function AddTestCasesDialog({
  open,
  onOpenChange,
  suites,
  runId,
  existingCaseIds,
  onAdded,
}: AddTestCasesDialogProps) {
  const [suiteId, setSuiteId] = useState("");
  const [testCases, setTestCases] = useState<TestCaseOption[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [loadingCases, setLoadingCases] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const existingSet = useMemo(() => new Set(existingCaseIds), [existingCaseIds]);

  // Filter out test cases already in the run
  const availableCases = useMemo(
    () => testCases.filter((tc) => !existingSet.has(tc.id)),
    [testCases, existingSet]
  );

  function handleClose() {
    onOpenChange(false);
    setSuiteId("");
    setTestCases([]);
    setSelectedCases(new Set());
    setError(null);
  }

  useEffect(() => {
    if (!suiteId) {
      setTestCases([]);
      setSelectedCases(new Set());
      return;
    }

    async function fetchCases() {
      setLoadingCases(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from("test_cases")
        .select("id, title, priority, status")
        .eq("suite_id", suiteId)
        .order("title");

      if (fetchErr) {
        setError(fetchErr.message);
        setTestCases([]);
      } else {
        setTestCases(data ?? []);
      }
      setLoadingCases(false);
    }

    fetchCases();
  }, [suiteId, supabase]);

  function handleToggle(id: string) {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selectedCases.size === 0) {
      setError("Select at least one test case");
      return;
    }

    setSaving(true);
    setError(null);

    const rows = Array.from(selectedCases).map((caseId) => ({
      test_run_id: runId,
      test_case_id: caseId,
      status: "not_run" as const,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("test_run_results")
      .insert(rows)
      .select("*, test_cases(id, title, priority, status)");

    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }

    onAdded(inserted ?? []);
    handleClose();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Test Cases</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-suite-select">Test Suite</Label>
            <Select value={suiteId} onValueChange={(v) => v && setSuiteId(v)}>
              <SelectTrigger id="add-suite-select">
                <SelectValue placeholder="Select a suite" />
              </SelectTrigger>
              <SelectContent>
                {suites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {suiteId && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Available Test Cases</Label>
                {availableCases.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedCases(new Set(availableCases.map((tc) => tc.id)))}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedCases(new Set())}
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>

              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableCases.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {testCases.length === 0
                      ? "No test cases in this suite"
                      : "All test cases from this suite are already in this run"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto rounded-lg border p-3">
                  {availableCases.map((tc) => (
                    <label
                      key={tc.id}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCases.has(tc.id)}
                        onChange={() => handleToggle(tc.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm font-medium flex-1">{tc.title}</span>
                      <Badge variant="secondary" className={`text-xs ${priorityBadgeClass[tc.priority]}`}>
                        {tc.priority}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}

              {selectedCases.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCases.size} test case{selectedCases.size === 1 ? "" : "s"} selected
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving || selectedCases.size === 0}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add {selectedCases.size > 0 ? `${selectedCases.size} ` : ""}Test Cases
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
