import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AddStepForm } from "./add-step-form";

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

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; suiteId: string; caseId: string }>;
}) {
  const { id, suiteId, caseId } = await params;
  const supabase = await createClient();

  const { data: testCase } = await supabase
    .from("test_cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (!testCase) notFound();

  const { data: steps } = await supabase
    .from("test_steps")
    .select("*")
    .eq("test_case_id", caseId)
    .order("step_number", { ascending: true });

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/projects/${id}/suites/${suiteId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{testCase.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className={priorityColors[testCase.priority]}>
              {testCase.priority}
            </Badge>
            <Badge variant="secondary" className={statusColors[testCase.status]}>
              {testCase.status}
            </Badge>
            {testCase.ai_generated && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Generated
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {testCase.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{testCase.description}</p>
            </CardContent>
          </Card>
        )}
        {testCase.preconditions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Preconditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{testCase.preconditions}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Test Steps</h2>
        </div>

        {steps && steps.length > 0 ? (
          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Expected Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-medium">{step.step_number}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{step.action}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{step.expected_result}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No steps defined yet.</p>
        )}

        <div className="mt-4">
          <AddStepForm
            testCaseId={caseId}
            nextStepNumber={(steps?.length ?? 0) + 1}
          />
        </div>
      </div>
    </div>
  );
}
