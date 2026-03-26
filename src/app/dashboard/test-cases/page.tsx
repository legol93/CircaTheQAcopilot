import { createClient } from "@/lib/supabase/server";
import { TestCasesLayout } from "./test-cases-layout";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite: activeSuiteId } = await searchParams;
  const supabase = await createClient();

  // Get current user's project (for now, use the first project)
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  const projectId = project?.id;

  // Get all test cases count
  const { count: totalCount } = await supabase
    .from("test_cases")
    .select("*", { count: "exact", head: true });

  // Get uncategorized count (cases not in any suite — for future use)
  const uncategorizedCount = 0;

  // Get folders
  const { data: folders } = await supabase
    .from("test_suites")
    .select("*, test_cases(count)")
    .eq("type", "folder")
    .order("name", { ascending: true });

  // Get sprints
  const { data: sprints } = await supabase
    .from("test_suites")
    .select("*, test_cases(count)")
    .eq("type", "sprint")
    .order("created_at", { ascending: false });

  // Get test cases for the active suite, or all if none selected
  let testCasesQuery = supabase
    .from("test_cases")
    .select("*, test_steps(count)")
    .order("created_at", { ascending: false });

  if (activeSuiteId) {
    testCasesQuery = testCasesQuery.eq("suite_id", activeSuiteId);
  }

  const { data: testCases } = await testCasesQuery;

  // Get active suite name
  let activeSuiteName = "All Test Cases";
  if (activeSuiteId) {
    const { data: activeSuite } = await supabase
      .from("test_suites")
      .select("name")
      .eq("id", activeSuiteId)
      .single();
    if (activeSuite) activeSuiteName = activeSuite.name;
  }

  return (
    <TestCasesLayout
      projectId={projectId ?? null}
      totalCount={totalCount ?? 0}
      uncategorizedCount={uncategorizedCount}
      folders={
        folders?.map((f) => ({
          id: f.id,
          name: f.name,
          count: (f.test_cases as { count: number }[])?.[0]?.count ?? 0,
          icon: f.icon,
          color: f.color,
        })) ?? []
      }
      sprints={
        sprints?.map((s) => ({
          id: s.id,
          name: s.name,
          count: (s.test_cases as { count: number }[])?.[0]?.count ?? 0,
        })) ?? []
      }
      testCases={testCases ?? []}
      activeSuiteId={activeSuiteId ?? null}
      activeSuiteName={activeSuiteName}
    />
  );
}
