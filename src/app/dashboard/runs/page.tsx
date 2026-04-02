import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RunsList } from "./runs-list";

export default async function TestRunsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  if (!project) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Test Runs</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage test executions
        </p>
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <h3 className="mt-4 text-lg font-semibold">No project found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create a project first to start creating test runs.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: runs }, { data: suites }] = await Promise.all([
    supabase
      .from("test_runs")
      .select("*, test_run_results(id, status)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("test_suites")
      .select("id, name")
      .eq("project_id", project.id)
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Test Runs</h1>
      <p className="mt-1 text-muted-foreground">
        View and manage test executions
      </p>

      <RunsList
        initialRuns={runs ?? []}
        suites={suites ?? []}
        projectId={project.id}
      />
    </div>
  );
}
