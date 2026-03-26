import { ExecutionsList } from "./executions-list";

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
  head_branch: string;
  run_number: number;
  run_attempt: number;
}

export interface GroupedRuns {
  date: string;
  runs: WorkflowRun[];
}

async function fetchWorkflowRuns(): Promise<WorkflowRun[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error("GITHUB_TOKEN or GITHUB_REPO not configured");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status}`);
      return [];
    }

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.workflow_runs ?? []).map((run: any) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      created_at: run.created_at,
      html_url: run.html_url,
      head_branch: run.head_branch,
      run_number: run.run_number,
      run_attempt: run.run_attempt,
    }));
  } catch (err) {
    console.error("Failed to fetch workflow runs:", err);
    return [];
  }
}

function groupByDate(runs: WorkflowRun[]): GroupedRuns[] {
  const map: Record<string, WorkflowRun[]> = {};
  for (const run of runs) {
    const dateKey = run.created_at.slice(0, 10);
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(run);
  }

  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, runs]) => ({ date, runs }));
}

export default async function DailyExecutionsPage() {
  const runs = await fetchWorkflowRuns();
  const grouped = groupByDate(runs);

  const totalRuns = runs.length;
  const successCount = runs.filter((r) => r.conclusion === "success").length;
  const failureCount = runs.filter((r) => r.conclusion === "failure").length;
  const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;

  return (
    <ExecutionsList
      grouped={grouped}
      totalRuns={totalRuns}
      successCount={successCount}
      failureCount={failureCount}
      successRate={successRate}
    />
  );
}
