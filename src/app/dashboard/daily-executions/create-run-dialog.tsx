"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateRunDialogProps {
  projectId: string;
}

export function CreateRunDialog({ projectId }: CreateRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [runDate, setRunDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [environment, setEnvironment] = useState("QA");
  const [runType, setRunType] = useState("manual");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setRunDate(new Date().toISOString().split("T")[0]);
      setEnvironment("QA");
      setRunType("manual");
      setNotes("");
      setError(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!runDate) {
      setError("Date is required");
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // 1. Create the execution run
    const { data: run, error: runError } = await supabase
      .from("daily_execution_runs")
      .insert({
        project_id: projectId,
        run_date: runDate,
        created_by: user.id,
        notes: notes.trim() || null,
        source: "manual",
        environment,
        run_type: runType,
      })
      .select("id")
      .single();

    if (runError || !run) {
      setError(runError?.message ?? "Failed to create run");
      setLoading(false);
      return;
    }

    // 2. Fetch all test cases for this project
    const { data: testCases } = await supabase
      .from("test_cases")
      .select("id, test_suites!inner(project_id)")
      .eq("test_suites.project_id", projectId);

    // 3. Insert initial results (not_run) for all test cases
    if (testCases && testCases.length > 0) {
      const results = testCases.map((tc) => ({
        run_id: run.id,
        test_case_id: tc.id,
        result: "not_run",
      }));

      const { error: resultsError } = await supabase
        .from("daily_execution_results")
        .insert(results);

      if (resultsError) {
        console.error("Failed to create initial results:", resultsError.message);
      }
    }

    setOpen(false);
    setLoading(false);
    router.push(`/dashboard/daily-executions/${run.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Execution Run
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>New Execution Run</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            {/* Date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="run-date">Date</Label>
              <input
                id="run-date"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>

            {/* Environment */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="run-environment">Environment</Label>
              <select
                id="run-environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="DEV">DEV</option>
                <option value="QA">QA</option>
                <option value="STAGING">STAGING</option>
                <option value="PROD">PROD</option>
              </select>
            </div>

            {/* Run Type */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="run-type">Run Type</Label>
              <select
                id="run-type"
                value={runType}
                onChange={(e) => setRunType(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="run-notes">Notes (optional)</Label>
              <Textarea
                id="run-notes"
                placeholder="Sprint 12 regression, hotfix validation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
