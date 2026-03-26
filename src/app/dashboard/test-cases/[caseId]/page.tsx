import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AddStepForm } from "./add-step-form";
import { EditableStepsTable } from "./editable-steps-table";
import { priorityBadgeClass, statusBadgeClass } from "@/lib/badge-variants";

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();

  const { data: testCase } = await supabase
    .from("test_cases")
    .select("*, test_suites(name)")
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
        <Link href={`/dashboard/test-cases?suite=${testCase.suite_id}`}>
          <Button variant="ghost" size="icon" aria-label="Back to test cases">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {(testCase.test_suites as { name: string })?.name}
          </p>
          <h1 className="text-3xl font-bold">{testCase.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className={priorityBadgeClass[testCase.priority]}>
              {testCase.priority}
            </Badge>
            <Badge variant="secondary" className={statusBadgeClass[testCase.status]}>
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
        <h2 className="text-xl font-semibold">Test Steps</h2>

        {steps && steps.length > 0 ? (
          <EditableStepsTable steps={steps} />
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
