import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ExecutionDetail } from "./execution-detail";

export default async function ExecutionRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the run
  const { data: run, error: runError } = await supabase
    .from("daily_execution_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    notFound();
  }

  // Fetch all results for this run, joined with test_cases for title & priority
  const { data: results } = await supabase
    .from("daily_execution_results")
    .select("*, test_cases(id, title, priority)")
    .eq("run_id", runId)
    .order("id", { ascending: true });

  // Calculate summary
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, not_run: 0 };
  (results ?? []).forEach((r) => {
    const key = r.result as keyof typeof counts;
    if (key in counts) counts[key]++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const executed = counts.passed + counts.failed + counts.flaky;
  const passRate =
    executed > 0 ? Math.round((counts.passed / executed) * 100) : 0;

  return (
    <ExecutionDetail
      run={run}
      results={results ?? []}
      summary={{ ...counts, total, passRate }}
    />
  );
}
