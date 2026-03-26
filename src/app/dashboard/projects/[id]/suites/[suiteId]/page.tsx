import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { CreateTestCaseDialog } from "./create-test-case-dialog";

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  deprecated: "bg-yellow-100 text-yellow-800",
};

export default async function SuiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; suiteId: string }>;
}) {
  const { id, suiteId } = await params;
  const supabase = await createClient();

  const { data: suite } = await supabase
    .from("test_suites")
    .select("*, projects(name)")
    .eq("id", suiteId)
    .single();

  if (!suite) notFound();

  const { data: testCases } = await supabase
    .from("test_cases")
    .select("*, test_steps(count)")
    .eq("suite_id", suiteId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/projects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {(suite.projects as { name: string })?.name}
          </p>
          <h1 className="text-3xl font-bold">{suite.name}</h1>
        </div>
        <CreateTestCaseDialog suiteId={suiteId} />
      </div>

      {!testCases || testCases.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No test cases yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first test case
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((tc) => (
                <TableRow key={tc.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/projects/${id}/suites/${suiteId}/cases/${tc.id}`}
                      className="font-medium hover:underline"
                    >
                      {tc.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={priorityColors[tc.priority]}>
                      {tc.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[tc.status]}>
                      {tc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(tc.test_steps as { count: number }[])?.[0]?.count ?? 0}
                  </TableCell>
                  <TableCell>
                    {tc.ai_generated ? (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Manual</span>
                    )}
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
