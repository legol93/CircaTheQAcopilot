import { NextResponse } from "next/server";

const WORKFLOW_MAP: Record<string, string> = {
  hybrid: "playwright-hybrid-plan-company.yml",
  school: "playwright-school-plan-company.yml",
};

export async function POST(request: Request) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json(
      { error: "GitHub configuration missing" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { workflow, branch, baseUrl, testSpec, sendSlack } = body as {
      workflow: "hybrid" | "school";
      branch: string;
      baseUrl: string;
      testSpec?: string;
      sendSlack: boolean;
    };

    const workflowFile = WORKFLOW_MAP[workflow];
    if (!workflowFile) {
      return NextResponse.json(
        { error: "Invalid workflow. Must be 'hybrid' or 'school'." },
        { status: 400 }
      );
    }

    if (!branch) {
      return NextResponse.json(
        { error: "Branch is required." },
        { status: 400 }
      );
    }

    // Build workflow dispatch inputs
    const inputs: Record<string, string> = {};
    if (baseUrl) inputs.base_url = baseUrl;
    if (testSpec) inputs.test_spec = testSpec;
    inputs.send_slack_notification = sendSlack ? "true" : "false";

    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: branch, inputs }),
      }
    );

    // GitHub returns 204 No Content on success
    if (res.status === 204) {
      return NextResponse.json({ success: true });
    }

    const text = await res.text();
    return NextResponse.json(
      { error: `GitHub API error: ${res.status}`, details: text },
      { status: res.status }
    );
  } catch (err) {
    console.error("trigger workflow error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
