import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN or GITHUB_REPO not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok && res.status !== 204) {
    return NextResponse.json(
      { error: `GitHub API error: ${res.status}` },
      { status: res.status },
    );
  }

  return NextResponse.json({ success: true });
}
