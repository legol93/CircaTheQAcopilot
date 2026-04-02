import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RunDetail } from "./run-detail";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch run
  const { data: run } = await supabase
    .from("test_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!run) notFound();

  // Fetch results with test case info + suites for "Add Test Cases"
  const [{ data: results }, { data: suites }] = await Promise.all([
    supabase
      .from("test_run_results")
      .select("*, test_cases(id, title, priority, status)")
      .eq("test_run_id", runId),
    supabase
      .from("test_suites")
      .select("id, name")
      .eq("project_id", run.project_id)
      .order("name"),
  ]);

  return (
    <RunDetail
      run={run}
      initialResults={results ?? []}
      suites={suites ?? []}
      userId={user.id}
    />
  );
}
