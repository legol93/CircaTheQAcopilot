import { createClient } from "@/lib/supabase/server";
import { TestCasesLayout } from "./test-cases-layout";
import { redirect } from "next/navigation";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite: activeSuiteId } = await searchParams;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get current user's project (for now, use the first project)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  if (projectError || !project) {
    // No project found — render with empty state
    return (
      <TestCasesLayout
        projectId={null}
        totalCount={0}
        uncategorizedCount={0}
        folders={[]}
        sprints={[]}
        testCases={[]}
        activeSuiteId={null}
        activeSuiteName="All Test Cases"
      />
    );
  }

  const projectId = project.id;

  // Get all test cases count scoped to project
  const { count: totalCount } = await supabase
    .from("test_cases")
    .select("*, test_suites!inner(project_id)", { count: "exact", head: true })
    .eq("test_suites.project_id", projectId);

  // Get uncategorized count (cases not in any suite — for future use)
  const uncategorizedCount = 0;

  // Get folders scoped to project
  const { data: folders } = await supabase
    .from("test_suites")
    .select("*, test_cases(count)")
    .eq("project_id", projectId)
    .eq("type", "folder")
    .order("name", { ascending: true });

  // Get sprints scoped to project
  const { data: sprints } = await supabase
    .from("test_suites")
    .select("*, test_cases(count)")
    .eq("project_id", projectId)
    .eq("type", "sprint")
    .order("created_at", { ascending: false });

  // Get test cases for the active suite, or all project cases if none selected
  let testCasesQuery = supabase
    .from("test_cases")
    .select("*, test_steps(count), test_suites!inner(project_id)")
    .eq("test_suites.project_id", projectId)
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
      projectId={projectId}
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
