"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  Sparkles,
  Upload,
  X,
  Image as ImageIcon,
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
            <Link key={ticket.id} href={`/dashboard/bug-tickets/${ticket.id}`}>
            <Card
              className={cn(
                "border-l-4 transition-all hover:shadow-md cursor-pointer",
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
            </Link>
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
  const [bugType, setBugType] = useState<"related_ticket" | "smoke_regression">("smoke_regression");
  const [environment, setEnvironment] = useState("QA");
  const [severity, setSeverity] = useState("medium");
  const [title, setTitle] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [labels, setLabels] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [improving, setImproving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const canImprove = title.trim().length >= 10 && stepsToReproduce.trim().length >= 20 &&
    actualResult.trim().length >= 10 && expectedResult.trim().length >= 10;

  async function handleImproveWithAI() {
    if (!canImprove) return;
    setImproving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/improve-bug-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          stepsToReproduce: stepsToReproduce.trim(),
          actualResult: actualResult.trim(),
          expectedResult: expectedResult.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "AI improvement failed");
      }
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.stepsToReproduce) setStepsToReproduce(data.stepsToReproduce);
      if (data.actualResult) setActualResult(data.actualResult);
      if (data.expectedResult) setExpectedResult(data.expectedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI improvement failed");
    } finally {
      setImproving(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    setEvidenceFiles((prev) => [...prev, ...files]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    setEvidenceFiles((prev) => [...prev, ...files]);
  }

  function removeFile(idx: number) {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setBugType("smoke_regression");
    setEnvironment("QA");
    setSeverity("medium");
    setTitle("");
    setStepsToReproduce("");
    setActualResult("");
    setExpectedResult("");
    setLabels("");
    setJiraKey("");
    setEvidenceFiles([]);
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 10) {
      setError("Title must be at least 10 characters");
      return;
    }
    if (stepsToReproduce.trim().length < 20) {
      setError("Steps to reproduce must be at least 20 characters");
      return;
    }
    if (actualResult.trim().length < 10) {
      setError("Actual result must be at least 10 characters");
      return;
    }
    if (expectedResult.trim().length < 10) {
      setError("Expected result must be at least 10 characters");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const description = `**Steps to Reproduce:**\n${stepsToReproduce.trim()}\n\n**Actual Result:**\n${actualResult.trim()}\n\n**Expected Result:**\n${expectedResult.trim()}`;

    const { data: inserted, error: insertError } = await supabase
      .from("bug_tickets")
      .insert({
        project_id: projectId,
        title: title.trim(),
        description,
        bug_type: bugType,
        environment,
        severity,
        status: "open",
        steps_to_reproduce: stepsToReproduce.trim(),
        actual_result: actualResult.trim(),
        expected_result: expectedResult.trim(),
        labels: labels.trim() || null,
        jira_key: jiraKey.trim() || null,
        jira_url: jiraKey.trim() ? `https://circathera.atlassian.net/browse/${jiraKey.trim()}` : null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setError(insertError?.message ?? "Failed to create bug ticket");
      setLoading(false);
      return;
    }

    // Parse steps text into individual rows in bug_ticket_steps
    const stepLines = stepsToReproduce
      .trim()
      .split("\n")
      .map((line) => line.replace(/^\s*\d+[\.\)\-]\s*/, "").trim())
      .filter((line) => line.length > 0);

    if (stepLines.length > 0) {
      await supabase.from("bug_ticket_steps").insert(
        stepLines.map((desc, i) => ({
          bug_ticket_id: inserted.id,
          step_number: i + 1,
          description: desc,
        })),
      );
    }

    setOpen(false);
    resetForm();
    setLoading(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Bug Ticket
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ maxWidth: "900px", width: "90vw" }}>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Create Bug Ticket
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Create a manual bug ticket draft that can be copied to Jira.
            </p>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-5">
            {/* Bug Type */}
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Bug Type</Label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bugType"
                    value="related_ticket"
                    checked={bugType === "related_ticket"}
                    onChange={() => setBugType("related_ticket")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Related to existing ticket</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bugType"
                    value="smoke_regression"
                    checked={bugType === "smoke_regression"}
                    onChange={() => setBugType("smoke_regression")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Smoke/Regression test</span>
                </label>
              </div>
            </div>

            {/* Environment + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Environment</Label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="DEV">DEV</option>
                  <option value="QA">QA</option>
                  <option value="STAGING">STAGING</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Priority</Label>
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
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bug-title" className="font-semibold">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bug-title"
                placeholder="Brief description of the bug (min 10 chars)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{title.length}/10 characters minimum</p>
            </div>

            {/* Steps to Reproduce */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bug-steps" className="font-semibold">
                Steps to Reproduce <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="bug-steps"
                placeholder={"1. Navigate to the login page\n2. Enter valid credentials\n3. Click the submit button\n4. Observe the error message"}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{stepsToReproduce.length}/20 characters minimum</p>
            </div>

            {/* Actual Result */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bug-actual" className="font-semibold">
                Actual Result <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="bug-actual"
                placeholder={'• Error message: "Something went wrong"\n• Page shows blank screen\n• Console shows 500 error'}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{actualResult.length}/10 characters minimum</p>
            </div>

            {/* Expected Result */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bug-expected" className="font-semibold">
                Expected Result <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="bug-expected"
                placeholder={"• User should be redirected to dashboard\n• Success message should appear\n• Data should be saved"}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{expectedResult.length}/10 characters minimum</p>
            </div>

            {/* Improve with AI */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImproveWithAI}
                disabled={!canImprove || improving}
                className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
              >
                {improving ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Improving...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" />Improve with AI</>
                )}
              </Button>
              {!canImprove && (
                <span className="text-xs text-muted-foreground">Fill in all required fields first</span>
              )}
            </div>

            {/* Evidence */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">Evidence (optional)</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-8 text-center transition-colors hover:border-muted-foreground/50"
              >
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop images, or{" "}
                  <label className="cursor-pointer font-medium text-primary hover:underline">
                    click to browse
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF — max 10MB</p>
              </div>
              {evidenceFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {evidenceFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                    >
                      <ImageIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jira Key (if related to existing ticket) */}
            {bugType === "related_ticket" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bug-jira" className="font-semibold">Jira Ticket Key</Label>
                <Input
                  id="bug-jira"
                  placeholder="ABATT-1234"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value)}
                />
              </div>
            )}

            {/* Labels */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bug-labels" className="font-semibold">Additional Labels (optional)</Label>
              <Input
                id="bug-labels"
                placeholder="e.g., frontend, api, performance (comma-separated)"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple labels with commas</p>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
