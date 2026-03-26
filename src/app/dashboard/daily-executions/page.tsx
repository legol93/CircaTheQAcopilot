import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExecutionsList } from "./executions-list";

export default async function DailyExecutionsPage() {
  const supabase = await createClient();

  // Get user (session already refreshed by middleware)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Auto-create default project if none exists (invisible to user)
  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  if (!project) {
    // Insert the project -- RLS allows insert if created_by = auth.uid()
    const { error: insertError } = await supabase
      .from("projects")
      .insert({ name: "Default", created_by: user.id });

    if (insertError) {
      console.error("Failed to create default project:", insertError.message);
    }

    // The trigger `add_project_owner` adds the user as owner,
    // so now SELECT will pass RLS
    const { data: newProject, error: selectError } = await supabase
      .from("projects")
      .select("id")
      .limit(1)
      .single();

    if (selectError) {
      console.error(
        "Failed to fetch project after create:",
        selectError.message
      );
    }

    project = newProject;
  }

  if (!project) {
    return (
      <ExecutionsList projectId="" runs={[]} />
    );
  }

  const projectId = project.id;

  // Fetch all execution runs for this project, most recent first
  const { data: runs } = await supabase
    .from("daily_execution_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("run_date", { ascending: false });

  // For each run, fetch aggregated result counts
  const runsWithStats = await Promise.all(
    (runs ?? []).map(async (run) => {
      const { data: results } = await supabase
        .from("daily_execution_results")
        .select("result")
        .eq("run_id", run.id);

      const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, not_run: 0 };
      (results ?? []).forEach((r) => {
        const key = r.result as keyof typeof counts;
        if (key in counts) counts[key]++;
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const executed = counts.passed + counts.failed + counts.flaky;
      const passRate = executed > 0 ? Math.round((counts.passed / executed) * 100) : 0;

      return {
        ...run,
        stats: { ...counts, total, passRate },
      };
    })
  );

  return (
    <ExecutionsList projectId={projectId} runs={runsWithStats} />
  );
}
