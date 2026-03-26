import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runStatusBadgeClass } from "@/lib/badge-variants";

export default async function TestRunsPage() {
  const supabase = await createClient();

  const { data: runs } = await supabase
    .from("test_runs")
    .select("*, projects(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold">Test Runs</h1>
      <p className="mt-1 text-muted-foreground">
        View and manage test executions
      </p>

      {!runs || runs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="bg-muted p-4 rounded-full">
            <PlayCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No test runs yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create a test run to start executing and tracking your test cases.
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Test Run
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{run.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(run.projects as { name: string })?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={runStatusBadgeClass[run.status]}>
                      {run.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(run.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
