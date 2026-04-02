import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Jira issue type IDs for ABATT project
// ---------------------------------------------------------------------------

const JIRA_ISSUE_TYPE_IDS: Record<string, string> = {
  bug: "10019",       // Bug (standalone)
  story_bug: "10162", // Story Bug (subtask)
};

// ---------------------------------------------------------------------------
// Map app severity to Jira priority names
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<string, string> = {
  Highest: "Highest",
  High: "High",
  Medium: "Medium",
  Low: "Low",
  Lowest: "Lowest",
};

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const CreateTicketSchema = z.object({
  ticketType: z.enum(["bug", "story_bug"]),
  parentTicketKey: z.string().optional(),
  environment: z.string().min(1, "Environment is required"),
  reporterName: z.string().min(1, "Reporter name is required"),
  reporterEmail: z.string().email("Invalid reporter email"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["Highest", "High", "Medium", "Low", "Lowest"]),
  labels: z.array(z.string()),
  bugTicketId: z.string().uuid("Invalid bug ticket ID"),
  projectId: z.string().uuid("Invalid project ID"),
});

// ---------------------------------------------------------------------------
// POST /api/jira/create-ticket
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await request.json();
    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      ticketType,
      parentTicketKey,
      environment,
      reporterName,
      reporterEmail,
      title,
      description,
      priority,
      labels,
      bugTicketId,
      projectId,
    } = parsed.data;

    // 3. Validate story_bug requires parentTicketKey
    if (ticketType === "story_bug" && !parentTicketKey?.trim()) {
      return NextResponse.json(
        { error: "Parent ticket key is required for Story Bug type" },
        { status: 400 },
      );
    }

    // 4. Fetch Jira connection from Supabase
    const { data: connection, error: connError } = await supabase
      .from("jira_connections")
      .select("site_url, jira_project_key, api_email, api_token")
      .eq("project_id", projectId)
      .maybeSingle();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No Jira connection found for this project. Configure it in Settings." },
        { status: 404 },
      );
    }

    if (!connection.api_email || !connection.api_token) {
      return NextResponse.json(
        { error: "Jira API credentials are missing. Update your Jira connection in Settings." },
        { status: 400 },
      );
    }

    // 5. Build Jira REST API request
    const siteUrl = connection.site_url.replace(/\/+$/, "");
    const projectKey = connection.jira_project_key;
    const issueTypeId = JIRA_ISSUE_TYPE_IDS[ticketType];

    // Build ADF (Atlassian Document Format) description
    const adfDescription = buildAdfDescription(description, environment, reporterName, reporterEmail);

    // Sanitize labels: Jira doesn't allow spaces in labels
    const sanitizedLabels = labels
      .map((l) => l.trim().replace(/\s+/g, "_"))
      .filter(Boolean);

    // Build fields
    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      issuetype: { id: issueTypeId },
      summary: title,
      description: adfDescription,
      priority: { name: PRIORITY_MAP[priority] || "Medium" },
      labels: sanitizedLabels,
    };

    // Add parent for story_bug (subtask)
    if (ticketType === "story_bug" && parentTicketKey) {
      fields.parent = { key: parentTicketKey.trim().toUpperCase() };
    }

    // 6. Call Jira REST API v3
    const auth = Buffer.from(
      `${connection.api_email}:${connection.api_token}`,
    ).toString("base64");

    const jiraRes = await fetch(`${siteUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!jiraRes.ok) {
      const errorBody = await jiraRes.json().catch(() => ({}));
      console.error("Jira API error:", JSON.stringify(errorBody));
      const errorMessages =
        errorBody.errors
          ? Object.values(errorBody.errors).join(", ")
          : errorBody.errorMessages?.join(", ") ?? "Unknown Jira error";
      return NextResponse.json(
        { error: `Jira API error: ${errorMessages}` },
        { status: jiraRes.status },
      );
    }

    const jiraData = await jiraRes.json();
    const issueKey = jiraData.key as string;
    const issueUrl = `${siteUrl}/browse/${issueKey}`;

    // 7. Update bug_tickets row with jira_key and jira_url
    const { error: updateError } = await supabase
      .from("bug_tickets")
      .update({
        jira_key: issueKey,
        jira_url: issueUrl,
      })
      .eq("id", bugTicketId);

    if (updateError) {
      console.error("Failed to update bug ticket with Jira key:", updateError.message);
      // Still return success since the Jira ticket was created
    }

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        issueKey,
        issueUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("create-ticket error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Build ADF (Atlassian Document Format) description
// ---------------------------------------------------------------------------

function buildAdfDescription(
  description: string,
  environment: string,
  reporterName: string,
  reporterEmail: string,
) {
  // Split description into paragraphs and build ADF content nodes
  const contentNodes: Record<string, unknown>[] = [];

  // Add environment and reporter info header
  contentNodes.push({
    type: "panel",
    attrs: { panelType: "info" },
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Environment: ", marks: [{ type: "strong" }] },
          { type: "text", text: environment },
          { type: "hardBreak" },
          { type: "text", text: "QA Engineer: ", marks: [{ type: "strong" }] },
          { type: "text", text: `${reporterName} (${reporterEmail})` },
        ],
      },
    ],
  });

  // Add description paragraphs
  const lines = description.split("\n");
  let currentParagraphContent: Record<string, unknown>[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (currentParagraphContent.length > 0) {
        contentNodes.push({
          type: "paragraph",
          content: currentParagraphContent,
        });
        currentParagraphContent = [];
      }
      continue;
    }

    // Check if line starts with ** for bold sections
    const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
    if (boldMatch) {
      if (currentParagraphContent.length > 0) {
        contentNodes.push({
          type: "paragraph",
          content: currentParagraphContent,
        });
        currentParagraphContent = [];
      }
      const heading: Record<string, unknown>[] = [
        { type: "text", text: boldMatch[1], marks: [{ type: "strong" }] },
      ];
      if (boldMatch[2]?.trim()) {
        heading.push({ type: "text", text: boldMatch[2] });
      }
      contentNodes.push({ type: "paragraph", content: heading });
    } else {
      if (currentParagraphContent.length > 0) {
        currentParagraphContent.push({ type: "hardBreak" });
      }
      currentParagraphContent.push({ type: "text", text: line });
    }
  }

  if (currentParagraphContent.length > 0) {
    contentNodes.push({
      type: "paragraph",
      content: currentParagraphContent,
    });
  }

  // Add "Created by Circa QA Copilot" footer
  contentNodes.push({
    type: "rule",
  });
  contentNodes.push({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Created by Circa QA Copilot",
        marks: [{ type: "em" }, { type: "textColor", attrs: { color: "#8993a4" } }],
      },
    ],
  });

  return {
    version: 1,
    type: "doc",
    content: contentNodes,
  };
}
