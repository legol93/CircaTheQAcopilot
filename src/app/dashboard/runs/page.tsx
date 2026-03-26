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
import { PlayCircle } from "lucide-react";

const runStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

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
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border py-12">
          <PlayCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No test runs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Test runs will appear here once created
          </p>
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
                    <Badge variant="secondary" className={runStatusColors[run.status]}>
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
