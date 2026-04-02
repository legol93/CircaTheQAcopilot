import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { JiraDraftsTable } from "./jira-drafts-table";

export default async function JiraDraftsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's project
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  if (!project) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Jira Drafts</h1>
        <p className="mt-1 text-muted-foreground">
          Jira tickets synced for test case generation
        </p>
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No project found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create a project first to start receiving Jira tickets.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: tickets }, { data: suites }] = await Promise.all([
    supabase
      .from("jira_pending_tickets")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("test_suites")
      .select("id, name")
      .eq("project_id", project.id)
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Jira Drafts</h1>
      <p className="mt-1 text-muted-foreground">
        Jira tickets synced for test case generation
      </p>

      {!tickets || tickets.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No Jira tickets</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Connect your Jira project in Settings to start receiving tickets
            via webhook.
          </p>
        </div>
      ) : (
        <JiraDraftsTable
          initialTickets={tickets}
          suites={suites ?? []}
        />
      )}
    </div>
  );
}
