"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bug,
  Plus,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BugTicket {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  jira_key: string | null;
  jira_url: string | null;
  source_test_case: string | null;
  created_at: string;
}

interface BugTicketsListProps {
  projectId: string;
}

const severityClass: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/50 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/50 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
  low: "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

const statusClass: Record<string, string> = {
  open: "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/50 dark:text-red-300",
  in_progress: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
  resolved: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

const statusIcon: Record<string, React.ReactNode> = {
  open: <AlertCircle className="h-4 w-4 text-red-600" />,
  in_progress: <Clock className="h-4 w-4 text-blue-600" />,
  resolved: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  closed: <CheckCircle2 className="h-4 w-4 text-slate-500" />,
};

export function BugTicketsList({ projectId }: BugTicketsListProps) {
  const [tickets, setTickets] = useState<BugTicket[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("bug_tickets")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTickets(data ?? []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  async function updateStatus(ticketId: string, newStatus: string) {
    await supabase.from("bug_tickets").update({ status: newStatus }).eq("id", ticketId);
    fetchTickets();
  }

  async function deleteTicket(ticketId: string) {
    await supabase.from("bug_tickets").delete().eq("id", ticketId);
    fetchTickets();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Tickets</h1>
          <p className="mt-1 text-muted-foreground">
            Track and manage bugs found during testing
          </p>
        </div>
        <CreateBugDialog projectId={projectId} onCreated={fetchTickets} />
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex items-center gap-2">
        {([
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "in_progress", label: "In Progress" },
          { key: "resolved", label: "Resolved" },
          { key: "closed", label: "Closed" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              filter === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <div className="rounded-full bg-muted p-4">
              <Bug className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No bug tickets</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              {filter === "all"
                ? "Create your first bug ticket to start tracking issues."
                : `No ${filter.replace("_", " ")} tickets.`}
            </p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <Card
              key={ticket.id}
              className={cn(
                "border-l-4 transition-all hover:shadow-sm",
                ticket.status === "open" ? "border-l-red-400" :
                ticket.status === "in_progress" ? "border-l-blue-400" :
                ticket.status === "resolved" ? "border-l-emerald-400" :
                "border-l-slate-300"
              )}
            >
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  {statusIcon[ticket.status]}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{ticket.title}</h3>
                      {ticket.jira_key && (
                        <a
                          href={ticket.jira_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                        >
                          {ticket.jira_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {ticket.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className={cn("rounded-full text-xs", severityClass[ticket.severity])}>
                        {ticket.severity}
                      </Badge>
                      <Badge variant="secondary" className={cn("rounded-full text-xs", statusClass[ticket.status])}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    aria-label="Change status"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteTicket(ticket.id)}
                    aria-label="Delete ticket"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Create Bug Dialog ──────────────────────────────────────── */

function CreateBugDialog({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [jiraKey, setJiraKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("bug_tickets").insert({
      project_id: projectId,
      title: trimmed,
      description: description.trim() || null,
      severity,
      status: "open",
      jira_key: jiraKey.trim() || null,
      jira_url: jiraKey.trim() ? `https://circathera.atlassian.net/browse/${jiraKey.trim()}` : null,
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      setOpen(false);
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setJiraKey("");
      setLoading(false);
      onCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Bug Ticket
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Bug Ticket</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bug-title">Title</Label>
              <Input
                id="bug-title"
                placeholder="Login button not working on mobile"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bug-desc">Description</Label>
              <Textarea
                id="bug-desc"
                placeholder="Steps to reproduce, expected vs actual behavior..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <Label>Severity</Label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="bug-jira">Jira Key (optional)</Label>
                <Input
                  id="bug-jira"
                  placeholder="ABATT-1234"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value)}
                />
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
