import { createClient } from "@/lib/supabase/server";
import { JiraSettingsForm } from "./jira-settings-form";

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
    </div>
  );
}
