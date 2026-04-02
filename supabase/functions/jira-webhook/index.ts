// supabase/functions/jira-webhook/index.ts
// Edge Function to receive Jira webhooks when issues move to "IN DEV ENV'T"
// Fetches full issue details from Jira API to avoid JSON encoding issues.

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate webhook secret ───────────────────────────────
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (!secret) {
      console.warn("[jira-webhook] Missing secret query param");
      return jsonResponse({ error: "Missing secret" });
    }

    // ── 2. Parse body ────────────────────────────────────────────
    const rawText = await req.text();
    const sanitized = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(sanitized);
    } catch {
      const aggressive = rawText.replace(/[\x00-\x1F\x7F]/g, " ");
      try {
        payload = JSON.parse(aggressive);
      } catch {
        console.error("[jira-webhook] Could not parse payload");
        return jsonResponse({ error: "Invalid JSON payload" });
      }
    }

    // ── 3. Extract issue key from payload ────────────────────────
    // Support both formats: { issue: { key: "X" } } and { issueKey: "X" }
    const issue = (payload.issue ?? {}) as Record<string, unknown>;
    const issueKey: string =
      (issue.key as string) ??
      (payload.issueKey as string) ??
      "";

    if (!issueKey) {
      console.warn("[jira-webhook] No issue key in payload");
      return jsonResponse({ error: "Missing issue key" });
    }

    const jiraProjectKey = issueKey.split("-")[0];

    // ── 4. Init Supabase admin client ────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 5. Look up jira_connection ───────────────────────────────
    const { data: connection, error: connError } = await supabaseAdmin
      .from("jira_connections")
      .select("project_id, site_url, api_email, api_token")
      .eq("jira_project_key", jiraProjectKey)
      .eq("webhook_secret", secret)
      .maybeSingle();

    if (connError || !connection) {
      console.warn(`[jira-webhook] No connection for "${jiraProjectKey}"`);
      return jsonResponse({ error: "Unknown project or invalid secret" });
    }

    // ── 6. Fetch full issue from Jira API ────────────────────────
    const siteUrl = connection.site_url.replace(/\/+$/, "");
    const auth = btoa(`${connection.api_email}:${connection.api_token}`);

    const jiraRes = await fetch(
      `${siteUrl}/rest/api/3/issue/${issueKey}?fields=summary,description,issuetype,priority,assignee,status`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
    );

    if (!jiraRes.ok) {
      console.error(`[jira-webhook] Jira API error: ${jiraRes.status}`);
      return jsonResponse({ error: "Failed to fetch issue from Jira" });
    }

    const jiraIssue = await jiraRes.json();
    const fields = jiraIssue.fields ?? {};

    // ── 7. Check if issue is in "IN DEV ENV'T" status ────────────
    const currentStatus: string = fields.status?.name ?? "";
    if (!currentStatus.toUpperCase().includes("IN DEV ENV")) {
      return jsonResponse({
        data: { skipped: true, reason: `Status is "${currentStatus}", not IN DEV ENV'T` },
      });
    }

    // ── 8. Extract clean data from Jira API response ─────────────
    const summary: string = fields.summary ?? "";
    // description from API v3 is ADF object, convert to string
    let description = "";
    if (typeof fields.description === "string") {
      description = fields.description;
    } else if (fields.description?.content) {
      // Extract text from ADF
      description = JSON.stringify(fields.description);
    }
    const issueType: string = fields.issuetype?.name ?? "";
    const priority: string = fields.priority?.name ?? "";
    const assignee: string = fields.assignee?.displayName ?? "";
    const issueId: string = String(jiraIssue.id ?? "");
    const jiraUrl = `${siteUrl}/browse/${issueKey}`;

    // ── 9. Upsert into jira_pending_tickets ──────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from("jira_pending_tickets")
      .upsert(
        {
          project_id: connection.project_id,
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

    console.log(`[jira-webhook] Saved ${issueKey} for project ${connection.project_id}`);

    return jsonResponse({
      data: { received: true, issue_key: issueKey, project_id: connection.project_id },
    });
  } catch (err) {
    console.error("[jira-webhook] Unexpected error:", (err as Error).message);
    return jsonResponse({ error: "Internal server error" });
  }
});
