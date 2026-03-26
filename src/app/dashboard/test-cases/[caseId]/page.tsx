import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, ExternalLink } from "lucide-react";
import { AddStepForm } from "./add-step-form";
import { EditableStepsTable } from "./editable-steps-table";
import { EditableCard } from "./editable-card";
import { StatusSelect } from "./status-select";
import { ImproveWithAi } from "./improve-with-ai";
import { EditableTitle } from "./editable-title";
import { ExportForClaude } from "./export-for-claude";
import { TestWithAi } from "./test-with-ai";
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

  // Find linked Jira ticket (if this test case was generated from Jira)
  const { data: jiraTicket } = await supabase
    .from("jira_pending_tickets")
    .select("jira_issue_key, jira_url")
    .eq("created_test_case_id", caseId)
    .single();

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
          <EditableTitle testCaseId={caseId} title={testCase.title} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusSelect
              testCaseId={caseId}
              currentStatus={testCase.status}
              currentPriority={testCase.priority}
            />
            {testCase.ai_generated && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Generated
              </Badge>
            )}
            {jiraTicket && (
              <a
                href={jiraTicket.jira_url ?? `https://circathera.atlassian.net/browse/${jiraTicket.jira_issue_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                {jiraTicket.jira_issue_key}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <ImproveWithAi testCaseId={caseId} />
            <TestWithAi
              testCaseId={caseId}
              testTitle={testCase.title}
              steps={(steps ?? []).map((s) => ({
                step_number: s.step_number,
                action: s.action,
                expected_result: s.expected_result,
              }))}
            />
            <ExportForClaude testCaseId={caseId} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EditableCard
          testCaseId={caseId}
          field="description"
          label="Description"
          value={testCase.description}
        />
        <EditableCard
          testCaseId={caseId}
          field="preconditions"
          label="Preconditions"
          value={testCase.preconditions}
        />
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
