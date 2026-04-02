// supabase/functions/jira-webhook/index.ts
// Edge Function to receive Jira webhooks when issues move to "IN DEV ENV'T"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Always return 200 to prevent Jira from retrying the webhook. */
function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate webhook secret via query param ────────────────
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (!secret) {
      console.warn("[jira-webhook] Missing secret query param");
      return jsonResponse({ error: "Missing secret" });
    }

    // ── 2. Parse body (sanitize control characters that Jira may send) ──
    const rawText = await req.text();
    // Remove control characters (except \n, \r, \t) that break JSON.parse
    const sanitized = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error("[jira-webhook] JSON parse error after sanitization:", parseErr);
      // Try more aggressive cleanup: replace all control chars including newlines inside strings
      const aggressive = rawText.replace(/[\x00-\x1F\x7F]/g, " ");
      try {
        payload = JSON.parse(aggressive);
      } catch {
        console.error("[jira-webhook] Could not parse payload even after aggressive cleanup");
        return jsonResponse({ error: "Invalid JSON payload" });
      }
    }

    // ── 3. Filter: status changes to "IN DEV ENV'T" or "READY FOR QA ENV'T"
    const changelogItems: Array<{
      field: string;
      fromString: string;
      toString: string;
    }> = payload?.changelog?.items ?? [];

    const statusChange = changelogItems.find((item) => {
      if (item.field !== "status") return false;
      const target = item.toString?.toUpperCase() ?? "";
      return target.includes("IN DEV ENV") || target.includes("READY FOR QA");
    });

    if (!statusChange) {
      return jsonResponse({
        data: { skipped: true, reason: "No relevant status change" },
      });
    }

    // ── 4. Extract issue data from payload ────────────────────────
    const issue = payload.issue;
    if (!issue?.key) {
      console.warn("[jira-webhook] Payload missing issue.key");
      return jsonResponse({ error: "Payload missing issue key" });
    }

    const issueKey: string = issue.key;
    const issueId: string = String(issue.id ?? "");
    const fields = issue.fields ?? {};
    const summary: string = fields.summary ?? "";
    const description: string = fields.description ?? "";
    const issueType: string = fields.issuetype?.name ?? "";
    const priority: string = fields.priority?.name ?? "";
    const assignee: string = fields.assignee?.displayName ?? "";

    // Derive jira_project_key from issue key (e.g. "PROJ-123" -> "PROJ")
    const jiraProjectKey = issueKey.split("-")[0];

    // ── 5. Init Supabase admin client (service role, bypass RLS) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 6. Look up jira_connection by project key + secret ────────
    const { data: connection, error: connError } = await supabaseAdmin
      .from("jira_connections")
      .select("project_id, site_url")
      .eq("jira_project_key", jiraProjectKey)
      .eq("webhook_secret", secret)
      .maybeSingle();

    if (connError) {
      console.error("[jira-webhook] DB error looking up connection:", connError.message);
      return jsonResponse({ error: "Internal error" });
    }

    if (!connection) {
      console.warn(
        `[jira-webhook] No matching connection for project key "${jiraProjectKey}"`,
      );
      return jsonResponse({ error: "Unknown project or invalid secret" });
    }

    const { project_id, site_url } = connection;
    const jiraUrl = `${site_url}/browse/${issueKey}`;

    // ── 7. Upsert into jira_pending_tickets ───────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from("jira_pending_tickets")
      .upsert(
        {
          project_id,
          jira_issue_key: issueKey,
          jira_issue_id: issueId,
          title: summary,
          description,
          issue_type: issueType,
          priority,
          assignee,
          jira_url: jiraUrl,
          status: "pending",
          webhook_payload: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,jira_issue_key" },
      );

    if (upsertError) {
      console.error("[jira-webhook] Upsert error:", upsertError.message);
      return jsonResponse({ error: "Failed to save ticket" });
    }

    console.log(
      `[jira-webhook] Saved pending ticket ${issueKey} for project ${project_id}`,
    );

    return jsonResponse({
      data: { received: true, issue_key: issueKey, project_id },
    });
  } catch (err) {
    // Always 200 so Jira does not retry
    console.error("[jira-webhook] Unexpected error:", (err as Error).message);
    return jsonResponse({ error: "Internal server error" });
  }
});
