import { notFound } from "next/navigation";
import { RunDetail } from "./run-detail";

export interface TestResult {
  name: string;
  status: "passed" | "failed" | "flaky";
  duration?: string;
  retries?: number;
  file?: string;
}

interface RunInfo {
  id: number;
  name: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
  head_branch: string;
  run_number: number;
}

async function fetchRunDetail(runId: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;

  // Fetch run info
  const runRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 60 },
    }
  );
  if (!runRes.ok) return null;
  const run = await runRes.json();

  // Fetch jobs to get check run ID
  const jobsRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!jobsRes.ok) return { run, tests: [] as TestResult[], summary: null };
  const jobsData = await jobsRes.json();
  const jobId = jobsData.jobs?.[0]?.id;
  if (!jobId) return { run, tests: [] as TestResult[], summary: null };

  // Fetch annotations
  const annRes = await fetch(
    `https://api.github.com/repos/${repo}/check-runs/${jobId}/annotations?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!annRes.ok) return { run, tests: [] as TestResult[], summary: null };
  const annotations = await annRes.json();

  // Parse Playwright Run Summary
  let passed = 0, failed = 0, flaky = 0;
  const tests: TestResult[] = [];

  for (const ann of annotations) {
    if (ann.title?.includes("Playwright Run Summary")) {
      const msg: string = ann.message || "";

      // Parse counts
      const passedMatch = msg.match(/(\d+)\s+passed/);
      const failedMatch = msg.match(/(\d+)\s+failed/);
      const flakyMatch = msg.match(/(\d+)\s+flaky/);
      passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      flaky = flakyMatch ? parseInt(flakyMatch[1]) : 0;

      // Parse failed test names
      const failedSection = msg.match(/\d+\s+failed\n([\s\S]*?)(?=\n\s+\d+\s+(?:flaky|passed)|$)/);
      if (failedSection) {
        const lines = failedSection[1].split("\n").filter((l: string) => l.trim().startsWith("["));
        for (const line of lines) {
          const nameMatch = line.match(/›\s+(.+?)(?:\s+─|$)/);
          const fileMatch = line.match(/›\s+(tests\/[^\s]+)/);
          if (nameMatch) {
            tests.push({
              name: nameMatch[1].trim().replace(/\s+─+$/, ""),
              status: "failed",
              file: fileMatch?.[1],
            });
          }
        }
      }

      // Parse flaky test names
      const flakySection = msg.match(/\d+\s+flaky\n([\s\S]*?)(?=\n\s+\d+\s+passed|$)/);
      if (flakySection) {
        const lines = flakySection[1].split("\n").filter((l: string) => l.trim().startsWith("["));
        for (const line of lines) {
          const nameMatch = line.match(/›\s+(.+?)(?:\s+─|$)/);
          const fileMatch = line.match(/›\s+(tests\/[^\s]+)/);
          if (nameMatch) {
            tests.push({
              name: nameMatch[1].trim().replace(/\s+─+$/, ""),
              status: "flaky",
              file: fileMatch?.[1],
            });
          }
        }
      }

      // Add passed tests as placeholders (we know count but not individual names)
      for (let i = 0; i < passed; i++) {
        tests.push({
          name: `Passed test ${i + 1}`,
          status: "passed",
        });
      }
    }

    // Note: individual failure annotations are duplicated per retry attempt
    // so we don't use them for retry counts (data not reliable from API)
  }

  // Parse slow test annotations for duration
  for (const ann of annotations) {
    if (ann.title === "Slow Test") {
      const durationMatch = ann.message?.match(/took\s+([\d.]+[ms]+)/);
      const fileMatch = ann.message?.match(/›\s+(tests\/[^\s]+)/);
      if (fileMatch) {
        const existing = tests.find((t) => t.file === fileMatch[1]);
        if (existing && durationMatch) {
          existing.duration = durationMatch[1];
        }
      }
    }
  }

  const summary = {
    total: passed + failed + flaky,
    passed,
    failed,
    flaky,
    passRate: (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : 0,
  };

  return { run, tests, summary };
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await fetchRunDetail(runId);

  if (!data) notFound();

  const { run, tests, summary } = data;

  const runInfo: RunInfo = {
    id: run.id,
    name: run.name,
    conclusion: run.conclusion,
    event: run.event,
    created_at: run.created_at,
    html_url: run.html_url,
    head_branch: run.head_branch,
    run_number: run.run_number,
  };

  return (
    <RunDetail
      run={runInfo}
      tests={tests}
      summary={summary ?? { total: 0, passed: 0, failed: 0, flaky: 0, passRate: 0 }}
    />
  );
}
