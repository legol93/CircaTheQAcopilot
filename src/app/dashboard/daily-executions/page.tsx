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
  test_total: number;
  test_passed: number;
  test_failed: number;
  test_flaky: number;
  pass_rate: number;
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
    const rawRuns = data.workflow_runs ?? [];

    // Fetch Playwright Run Summary annotations for each completed run
    const runs: WorkflowRun[] = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawRuns.map(async (run: any) => {
        let passed = 0, failed = 0, flaky = 0;

        if (run.status === "completed") {
          try {
            // Get jobs to find the check run ID
            const jobsRes = await fetch(
              `https://api.github.com/repos/${repo}/actions/runs/${run.id}/jobs`,
              { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
            );
            if (jobsRes.ok) {
              const jobsData = await jobsRes.json();
              const jobId = jobsData.jobs?.[0]?.id;
              if (jobId) {
                // Get annotations for this job
                const annRes = await fetch(
                  `https://api.github.com/repos/${repo}/check-runs/${jobId}/annotations?per_page=50`,
                  { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
                );
                if (annRes.ok) {
                  const annotations = await annRes.json();
                  // Find the "Playwright Run Summary" annotation
                  for (const ann of annotations) {
                    if (ann.title?.includes("Playwright Run Summary")) {
                      const msg = ann.message || "";
                      const passedMatch = msg.match(/(\d+)\s+passed/);
                      const failedMatch = msg.match(/(\d+)\s+failed/);
                      const flakyMatch = msg.match(/(\d+)\s+flaky/);
                      passed = passedMatch ? parseInt(passedMatch[1]) : 0;
                      failed = failedMatch ? parseInt(failedMatch[1]) : 0;
                      flaky = flakyMatch ? parseInt(flakyMatch[1]) : 0;
                      break;
                    }
                  }
                }
              }
            }
          } catch {
            // Ignore — show 0s
          }
        }

        const total = passed + failed + flaky;
        const passRate = (passed + failed) > 0
          ? Math.round((passed / (passed + failed)) * 100)
          : 0;

        return {
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
          test_total: total,
          test_passed: passed,
          test_failed: failed,
          test_flaky: flaky,
          pass_rate: passRate,
        };
      })
    );

    return runs;
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
