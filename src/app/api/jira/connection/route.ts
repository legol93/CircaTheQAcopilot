import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Supabase Edge Function base URL for webhooks
// ---------------------------------------------------------------------------

const SUPABASE_FUNCTIONS_URL =
  "https://uxmnbgvkcehwxlgobfph.supabase.co/functions/v1";

// ---------------------------------------------------------------------------
// Request body schema for POST
// ---------------------------------------------------------------------------

const CreateConnectionSchema = z.object({
  projectId: z.string().uuid("Invalid projectId"),
  jiraBaseUrl: z.string().url("Invalid Jira base URL"),
  jiraProjectKey: z
    .string()
    .min(1, "Jira project key is required")
    .max(20, "Jira project key is too long"),
});

// ---------------------------------------------------------------------------
// GET /api/jira/connection
// Fetch the Jira connection for the user's project
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional project filter via query param
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    let query = supabase.from("jira_connections").select("*");

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error("Failed to fetch Jira connections:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 },
      );
    }

    // Enrich each connection with the webhook URL
    const enriched = (connections ?? []).map((conn) => ({
      ...conn,
      webhook_url: conn.webhook_secret
        ? `${SUPABASE_FUNCTIONS_URL}/jira-webhook?secret=${conn.webhook_secret}`
        : null,
    }));

    return NextResponse.json({ connections: enriched });
  } catch (error) {
    console.error("GET jira/connection error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/jira/connection
// Create or update a Jira connection for a project
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse & validate body
    const body = await request.json();
    const parsed = CreateConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { projectId, jiraBaseUrl, jiraProjectKey } = parsed.data;

    // Generate a unique webhook secret
    const webhookSecret = crypto.randomUUID();

    // Check if a connection already exists for this project
    const { data: existing } = await supabase
      .from("jira_connections")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    let connectionId: string;

    if (existing) {
      // Update existing connection
      const { data: updated, error: updateError } = await supabase
        .from("jira_connections")
        .update({
          jira_base_url: jiraBaseUrl,
          jira_project_key: jiraProjectKey,
          webhook_secret: webhookSecret,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError || !updated) {
        console.error(
          "Failed to update Jira connection:",
          updateError?.message,
        );
        return NextResponse.json(
          { error: "Failed to update connection" },
          { status: 500 },
        );
      }

      connectionId = updated.id;
    } else {
      // Create new connection
      const { data: created, error: createError } = await supabase
        .from("jira_connections")
        .insert({
          project_id: projectId,
          jira_base_url: jiraBaseUrl,
          jira_project_key: jiraProjectKey,
          webhook_secret: webhookSecret,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error(
          "Failed to create Jira connection:",
          createError?.message,
        );
        return NextResponse.json(
          { error: "Failed to create connection" },
          { status: 500 },
        );
      }

      connectionId = created.id;
    }

    const webhookUrl = `${SUPABASE_FUNCTIONS_URL}/jira-webhook?secret=${webhookSecret}`;

    return NextResponse.json(
      {
        connectionId,
        webhookUrl,
        webhookSecret,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    console.error("POST jira/connection error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
