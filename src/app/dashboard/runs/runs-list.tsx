"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayCircle } from "lucide-react";
import { runStatusBadgeClass } from "@/lib/badge-variants";
import { CreateRunDialog } from "./create-run-dialog";
import type { TestRun, TestRunResult } from "@/types/database";

interface RunWithResults extends TestRun {
  test_run_results: Pick<TestRunResult, "id" | "status">[];
  projects?: { name: string };
}

interface RunsListProps {
  initialRuns: RunWithResults[];
  suites: { id: string; name: string }[];
  projectId: string;
}

export function RunsList({ initialRuns, suites, projectId }: RunsListProps) {
  const router = useRouter();

  function handleRowClick(runId: string) {
    router.push(`/dashboard/runs/${runId}`);
  }

  function calculateProgress(results: Pick<TestRunResult, "id" | "status">[]) {
    if (!results || results.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const total = results.length;
    const completed = results.filter((r) => r.status !== "not_run").length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }

  if (!initialRuns || initialRuns.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <div className="bg-muted p-4 rounded-full">
          <PlayCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No test runs yet</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
          Create a test run to start executing and tracking your test cases.
        </p>
        <div className="mt-4">
          <CreateRunDialog projectId={projectId} suites={suites} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end">
        <CreateRunDialog projectId={projectId} suites={suites} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Cases</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRuns.map((run) => {
              const progress = calculateProgress(run.test_run_results);

              return (
                <TableRow
                  key={run.id}
                  onClick={() => handleRowClick(run.id)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">{run.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={runStatusBadgeClass[run.status]}
                    >
                      {run.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {progress.percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {progress.completed} / {progress.total}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(run.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
