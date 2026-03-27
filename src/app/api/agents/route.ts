import { NextResponse } from "next/server";

interface AgentData {
  name: string;
  description: string;
  model: string;
  tools: string;
  systemPrompt: string;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO_MAIN ?? "legol93/CircaTheQAcopilot";

  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  try {
    // List files in .claude/agents/
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        next: { revalidate: 0 },
      }
    );

    if (!treeRes.ok) {
      return NextResponse.json({ error: "Failed to fetch repo tree" }, { status: 500 });
    }

    const treeData = await treeRes.json();
    const agentFiles = (treeData.tree ?? []).filter(
      (item: { path: string }) =>
        item.path.startsWith(".claude/agents/") && item.path.endsWith(".md")
    );

    // Fetch each agent file
    const agents: AgentData[] = [];

    for (const file of agentFiles) {
      const contentRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/${file.path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!contentRes.ok) continue;

      const contentData = await contentRes.json();
      const content = Buffer.from(contentData.content, "base64").toString("utf-8");

      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;

      const frontmatter = frontmatterMatch[1];
      const body = content.slice(frontmatterMatch[0].length).trim();

      const getName = (fm: string) => fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const getDesc = (fm: string) => fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const getModel = (fm: string) => fm.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const getTools = (fm: string) => fm.match(/^tools:\s*(.+)$/m)?.[1]?.trim() ?? "";

      const name = getName(frontmatter);
      if (!name) continue;

      agents.push({
        name,
        description: getDesc(frontmatter),
        model: getModel(frontmatter),
        tools: getTools(frontmatter),
        systemPrompt: body.slice(0, 500),
      });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}
