"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bug,
  Link2,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  bug_type: string | null;
  environment: string | null;
  severity: string;
  status: string;
  steps_to_reproduce: string | null;
  actual_result: string | null;
  expected_result: string | null;
  labels: string | null;
  jira_key: string | null;
  jira_url: string | null;
  project_id: string;
}

interface CreateInJiraDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (issueKey: string, issueUrl: string) => void;
}

type TicketType = "bug" | "story_bug";
type Environment = "Dev" | "QA" | "Prod";
type JiraPriority = "Highest" | "High" | "Medium" | "Low" | "Lowest";

// ---------------------------------------------------------------------------
// Map app severity to Jira priority
// ---------------------------------------------------------------------------

const SEVERITY_TO_PRIORITY: Record<string, JiraPriority> = {
  critical: "Highest",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ---------------------------------------------------------------------------
// Map app environment to dialog environment
// ---------------------------------------------------------------------------

const ENV_MAP: Record<string, Environment> = {
  DEV: "Dev",
  QA: "QA",
  STAGING: "QA",
  PROD: "Prod",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateInJiraDialog({
  ticket,
  open,
  onOpenChange,
  onCreated,
}: CreateInJiraDialogProps) {
  const supabase = createClient();

  // Form state
  const [ticketType, setTicketType] = useState<TicketType>("bug");
  const [parentTicketKey, setParentTicketKey] = useState("");
  const [environments, setEnvironments] = useState<Environment[]>([
    ENV_MAP[ticket.environment ?? "QA"] ?? "QA",
  ]);
  const [reporterName, setReporterName] = useState("Leonardo Cantillo");
  const [reporterEmail, setReporterEmail] = useState("leo@circathera.com");
  const [priority, setPriority] = useState<JiraPriority>(
    SEVERITY_TO_PRIORITY[ticket.severity] ?? "Medium",
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdIssue, setCreatedIssue] = useState<{
    key: string;
    url: string;
  } | null>(null);

  // Pre-fill reporter from session
  useEffect(() => {
    if (open) {
      setCreatedIssue(null);
      setError(null);
    }
  }, [open, supabase]);

  // Derived values
  function toggleEnv(env: Environment) {
    setEnvironments((prev) => {
      if (prev.includes(env)) {
        return prev.length > 1 ? prev.filter((e) => e !== env) : prev;
      }
      return [...prev, env];
    });
  }

  const typeLabel = ticketType === "bug" ? "Bug" : "Story Bug";
  const envLabel = environments.join("/");
  const generatedTitle = `[${typeLabel}][${envLabel}] ${ticket.title}`;

  const autoLabels = [
    ticketType === "bug" ? "bug" : "story-bug",
    ...environments.map((e) => e.toLowerCase()),
    `priority-${priority.toLowerCase()}`,
    "circa-qa",
  ];
  const userLabels = ticket.labels
    ? ticket.labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const allLabels = [...new Set([...autoLabels, ...userLabels])];

  // Parse parent key from URL or raw key
  function parseParentKey(input: string): string {
    const trimmed = input.trim();
    // Match URL pattern like https://circathera.atlassian.net/browse/ABATT-1234
    const urlMatch = trimmed.match(/\/browse\/([A-Z]+-\d+)/i);
    if (urlMatch) return urlMatch[1].toUpperCase();
    // Match raw key pattern like ABATT-1234
    const keyMatch = trimmed.match(/^([A-Z]+-\d+)$/i);
    if (keyMatch) return keyMatch[1].toUpperCase();
    return trimmed.toUpperCase();
  }

  const parsedParentKey = parentTicketKey
    ? parseParentKey(parentTicketKey)
    : "";

  // Build full description
  function buildDescription(): string {
    const parts: string[] = [];

    if (ticket.steps_to_reproduce) {
      parts.push(`**Steps to Reproduce:**\n${ticket.steps_to_reproduce}`);
    }
    if (ticket.actual_result) {
      parts.push(`**Actual Result:**\n${ticket.actual_result}`);
    }
    if (ticket.expected_result) {
      parts.push(`**Expected Result:**\n${ticket.expected_result}`);
    }
    if (
      ticket.description &&
      !ticket.description.startsWith("**Steps to Reproduce:")
    ) {
      parts.push(`**Additional Notes:**\n${ticket.description}`);
    }

    return parts.join("\n\n");
  }

  async function handleCreate() {
    setError(null);
    setLoading(true);

    try {
      if (ticketType === "story_bug" && !parsedParentKey) {
        setError("Please enter a parent ticket key for Story Bug type.");
        setLoading(false);
        return;
      }

      if (!reporterName.trim()) {
        setError("Reporter name is required.");
        setLoading(false);
        return;
      }

      if (!reporterEmail.trim()) {
        setError("Reporter email is required.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/jira/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketType,
          parentTicketKey:
            ticketType === "story_bug" ? parsedParentKey : undefined,
          environment: envLabel,
          reporterName: reporterName.trim(),
          reporterEmail: reporterEmail.trim(),
          title: generatedTitle,
          description: buildDescription(),
          priority,
          labels: allLabels,
          bugTicketId: ticket.id,
          projectId: ticket.project_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create Jira ticket");
      }

      setCreatedIssue({ key: data.issueKey, url: data.issueUrl });
      onCreated(data.issueKey, data.issueUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "560px", width: "90vw" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-sky-600" />
            Create in Jira
          </DialogTitle>
          <DialogDescription>
            Push this bug ticket to your Jira project as a new issue.
          </DialogDescription>
        </DialogHeader>

        {createdIssue ? (
          /* ─── Success State ─── */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Ticket Created!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your bug ticket is now in Jira.
              </p>
            </div>
            <a
              href={createdIssue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
            >
              {createdIssue.key}
              <ExternalLink className="h-4 w-4" />
            </a>
            <DialogFooter className="w-full">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ─── Form State ─── */
          <div className="flex flex-col gap-5 pt-1">
            {/* Ticket Type */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">Ticket Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTicketType("bug")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    ticketType === "bug"
                      ? "border-sky-500 bg-sky-50 ring-1 ring-sky-200"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
                  )}
                >
                  <Bug
                    className={cn(
                      "h-6 w-6",
                      ticketType === "bug"
                        ? "text-sky-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        ticketType === "bug" ? "text-sky-700" : "",
                      )}
                    >
                      Bug
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Standalone ticket
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTicketType("story_bug")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    ticketType === "story_bug"
                      ? "border-sky-500 bg-sky-50 ring-1 ring-sky-200"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
                  )}
                >
                  <Link2
                    className={cn(
                      "h-6 w-6",
                      ticketType === "story_bug"
                        ? "text-sky-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        ticketType === "story_bug" ? "text-sky-700" : "",
                      )}
                    >
                      Story Bug
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sub-task of a ticket
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Parent Ticket (only for Story Bug) */}
            {ticketType === "story_bug" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="parent-key" className="text-sm font-semibold">
                  Parent Ticket{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="parent-key"
                  placeholder="ABATT-3999 or full Jira URL"
                  value={parentTicketKey}
                  onChange={(e) => setParentTicketKey(e.target.value)}
                />
                {parsedParentKey && (
                  <p className="text-xs text-muted-foreground">
                    Will create sub-task under{" "}
                    <span className="font-medium text-foreground">
                      {parsedParentKey}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Environment */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">Environment</Label>
              <div className="flex gap-2">
                {(["Dev", "QA", "Prod"] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => toggleEnv(env)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                      environments.includes(env)
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JiraPriority)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Highest">Highest</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Lowest">Lowest</option>
              </select>
            </div>

            {/* Reporter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter-name" className="text-sm font-semibold">
                  Reporter Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reporter-name"
                  placeholder="John Doe"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter-email" className="text-sm font-semibold">
                  Reporter Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reporter-email"
                  type="email"
                  placeholder="john@company.com"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Preview Card */}
            <Card className="border-sky-200 bg-sky-50/50">
              <CardContent className="flex flex-col gap-3 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preview
                </p>
                <p className="text-sm font-semibold leading-snug">
                  {generatedTitle}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-xs",
                      priority === "Highest"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : priority === "High"
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : priority === "Medium"
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-slate-50 text-slate-700",
                    )}
                  >
                    {priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    QA Engineer: {reporterName || "..."}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="rounded-full text-xs"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create in Jira
                    <ExternalLink className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
