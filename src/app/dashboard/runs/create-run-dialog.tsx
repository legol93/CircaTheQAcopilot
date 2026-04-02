"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { priorityBadgeClass } from "@/lib/badge-variants";
import type { Priority } from "@/types/database";

interface CreateRunDialogProps {
  projectId: string;
  suites: { id: string; name: string }[];
}

interface TestCaseListItem {
  id: string;
  title: string;
  priority: Priority;
}

export function CreateRunDialog({ projectId, suites }: CreateRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [testCases, setTestCases] = useState<TestCaseListItem[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [loadingCases, setLoadingCases] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setName("");
      setSuiteId("");
      setTestCases([]);
      setSelectedCases(new Set());
      setError(null);
    }
  }

  useEffect(() => {
    if (!suiteId) {
      setTestCases([]);
      setSelectedCases(new Set());
      return;
    }

    async function fetchTestCases() {
      setLoadingCases(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("test_cases")
        .select("id, title, priority")
        .eq("suite_id", suiteId)
        .order("title");

      if (fetchError) {
        setError(fetchError.message);
        setTestCases([]);
      } else {
        setTestCases(data ?? []);
      }

      setLoadingCases(false);
    }

    fetchTestCases();
  }, [suiteId, supabase]);

  function handleToggleCase(caseId: string) {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedCases(new Set(testCases.map((tc) => tc.id)));
  }

  function handleDeselectAll() {
    setSelectedCases(new Set());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Run name is required");
      return;
    }

    if (!suiteId) {
      setError("Please select a suite");
      return;
    }

    if (selectedCases.size === 0) {
      setError("Please select at least one test case");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .insert({
        project_id: projectId,
        name: name.trim(),
        status: "pending",
        executed_by: user.id,
      })
      .select("id")
      .single();

    if (runError) {
      setError(runError.message);
      setLoading(false);
      return;
    }

    const results = Array.from(selectedCases).map((caseId) => ({
      test_run_id: run.id,
      test_case_id: caseId,
      status: "not_run" as const,
    }));

    const { error: resultsError } = await supabase
      .from("test_run_results")
      .insert(results);

    if (resultsError) {
      setError(resultsError.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName("");
    setSuiteId("");
    setTestCases([]);
    setSelectedCases(new Set());
    setLoading(false);
    router.refresh();
    router.push(`/dashboard/runs/${run.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Test Run
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Test Run</DialogTitle>
            <DialogDescription>
              Create a new test run to execute test cases
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="run-name">Run Name</Label>
              <Input
                id="run-name"
                placeholder="Sprint 23 - Regression"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="suite-select">Test Suite</Label>
              <Select value={suiteId} onValueChange={(v) => v && setSuiteId(v)}>
                <SelectTrigger id="suite-select">
                  <SelectValue placeholder="Select a suite" />
                </SelectTrigger>
                <SelectContent>
                  {suites.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No suites available
                    </div>
                  ) : (
                    suites.map((suite) => (
                      <SelectItem key={suite.id} value={suite.id}>
                        {suite.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {suiteId && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Test Cases</Label>
                  {testCases.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSelectAll}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleDeselectAll}
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
                ) : testCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No test cases in this suite
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-3">
                    {testCases.map((testCase) => (
                      <label
                        key={testCase.id}
                        className="flex items-start gap-3 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCases.has(testCase.id)}
                          onChange={() => handleToggleCase(testCase.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-sm font-medium">
                            {testCase.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`w-fit text-xs ${priorityBadgeClass[testCase.priority]}`}
                          >
                            {testCase.priority}
                          </Badge>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedCases.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCases.size} test case
                    {selectedCases.size === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingCases}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Run"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
