import { createClient } from "@/lib/supabase/server";
import { JiraSettingsForm } from "./jira-settings-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's project
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  // Fetch existing Jira connection for this project
  let jiraConnection = null;
  if (project) {
    const { data } = await supabase
      .from("jira_connections")
      .select("*")
      .eq("project_id", project.id)
      .limit(1)
      .single();
    jiraConnection = data;
  }

  // Fetch AI usage logs
  const { data: aiLogs } = await supabase
    .from("ai_prompts_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Calculate totals
  const totalTokens = (aiLogs ?? []).reduce((sum, log) => sum + (log.tokens_used ?? 0), 0);
  const totalCalls = (aiLogs ?? []).length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your account settings
      </p>

      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">User ID</p>
            <p className="font-mono text-sm">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Provider</p>
            <p className="font-medium">{user?.app_metadata?.provider}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Jira Integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your Jira project to automatically sync tickets for test case
          generation.
        </p>
        <div className="mt-4">
          {project ? (
            <JiraSettingsForm
              connection={jiraConnection}
              projectId={project.id}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a project first to configure Jira integration.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Anthropic API Usage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Token consumption breakdown by action
        </p>

        <div className="mt-4 flex gap-6">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">Total Calls</p>
            <p className="text-2xl font-bold tracking-tight">{totalCalls}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">Total Tokens</p>
            <p className="text-2xl font-bold tracking-tight">{totalTokens.toLocaleString()}</p>
          </div>
        </div>

        {aiLogs && aiLogs.length > 0 ? (
          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-sm">{log.prompt}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full font-mono text-xs">
                        {log.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {log.tokens_used?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No AI usage yet. Generate test cases from Jira tickets to see consumption here.
          </p>
        )}
      </div>
    </div>
  );
}
