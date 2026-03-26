import { NextRequest, NextResponse } from "next/server";

export interface GitHubWorkflowRun {
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

export async function GET(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json(
      { error: "GitHub configuration missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const perPage = searchParams.get("per_page") ?? "30";
  const page = searchParams.get("page") ?? "1";

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=${perPage}&page=${page}`,
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
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();

    const runs: GitHubWorkflowRun[] = (data.workflow_runs ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (run: any) => ({
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
      })
    );

    /* Group by date (YYYY-MM-DD) */
    const grouped: Record<string, GitHubWorkflowRun[]> = {};
    for (const run of runs) {
      const dateKey = run.created_at.slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(run);
    }

    return NextResponse.json({
      total_count: data.total_count,
      runs,
      grouped,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch runs", details: String(err) },
      { status: 500 }
    );
  }
}
