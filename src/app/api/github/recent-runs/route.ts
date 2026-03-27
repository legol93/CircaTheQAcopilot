import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json(
      { error: "GitHub configuration missing" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 30 },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runs = (data.workflow_runs ?? []).map((run: any) => ({
      id: run.id,
      name: run.name,
      conclusion: run.conclusion,
      status: run.status,
      head_branch: run.head_branch,
      created_at: run.created_at,
      html_url: run.html_url,
    }));

    return NextResponse.json({ runs });
  } catch (err) {
    console.error("recent-runs error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
