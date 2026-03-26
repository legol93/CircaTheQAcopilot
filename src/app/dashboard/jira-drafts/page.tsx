import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, FileText } from "lucide-react";

const jiraStatusBadgeClass: Record<string, string> = {
  pending:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  dismissed:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  created:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
};

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

  const { data: tickets } = await supabase
    .from("jira_pending_tickets")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

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
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jira Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <a
                      href={
                        ticket.jira_url ??
                        `https://jira.atlassian.net/browse/${ticket.jira_key}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                    >
                      {ticket.jira_key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ticket.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.issue_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        jiraStatusBadgeClass[ticket.status] ?? ""
                      }
                    >
                      {ticket.status}
                    </Badge>
                    {ticket.status === "created" &&
                      ticket.test_case_id && (
                        <Link
                          href={`/dashboard/test-cases/${ticket.test_case_id}`}
                          className="ml-2 text-xs text-blue-600 hover:underline"
                        >
                          View test case
                        </Link>
                      )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
