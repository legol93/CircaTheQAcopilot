"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

interface PendingTicket {
  id: string;
  jira_issue_key: string;
  title: string;
  issue_type: string;
  priority: string;
  jira_url: string | null;
  status: string;
}

interface JiraPendingBannerProps {
  projectId: string;
  suites: { id: string; name: string }[];
}

export function JiraPendingBanner({
  projectId,
  suites,
}: JiraPendingBannerProps) {
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [selectedSuites, setSelectedSuites] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("jira_pending_tickets")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Failed to fetch Jira pending tickets:", fetchError.message);
      return;
    }

    setTickets(data ?? []);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function handleDismiss(ticketId: string) {
    setError(null);
    try {
      const res = await fetch("/api/jira/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingTicketId: ticketId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to dismiss ticket");
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss ticket");
    }
  }

  async function handleCreateTestCase(ticketId: string) {
    const suiteId = selectedSuites[ticketId];
    if (!suiteId) {
      setError("Please select a destination suite first");
      return;
    }

    setError(null);
    setLoadingTicketId(ticketId);

    try {
      const res = await fetch("/api/jira/generate-test-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingTicketId: ticketId, targetSuiteId: suiteId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate test case");
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate test case"
      );
    } finally {
      setLoadingTicketId(null);
    }
  }

  if (tickets.length === 0) {
    return null;
  }

  return (
    <div className="mx-6 mt-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
        aria-expanded={!collapsed}
      >
        <svg
          className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.34 4.34h1.8v1.72A4.35 4.35 0 0 0 12.48 22v-9.56a.84.84 0 0 0-.84-.84H2Z" />
        </svg>
        <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Jira Tickets Ready for Testing
        </span>
        <Badge variant="secondary" className="h-5 rounded-full bg-blue-200/80 text-blue-800 dark:bg-blue-800/60 dark:text-blue-200">
          {tickets.length}
        </Badge>
        <span className="ml-auto">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-400 dark:text-blue-500" />
          )}
        </span>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="border-t border-blue-200/60 px-4 pb-3 dark:border-blue-800/40">
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={
                        ticket.jira_url ??
                        `https://jira.atlassian.net/browse/${ticket.jira_issue_key}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {ticket.jira_issue_key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-sm text-foreground">
                      {ticket.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="rounded-full border-border/80 text-xs">
                      {ticket.issue_type}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-border/80 text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedSuites[ticket.id] ?? ""}
                    onChange={(e) =>
                      setSelectedSuites((prev) => ({
                        ...prev,
                        [ticket.id]: e.target.value,
                      }))
                    }
                    aria-label="Select destination suite"
                    className="h-8 min-w-[140px] rounded-lg border border-input bg-background px-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>Select suite</option>
                    {suites.map((suite) => (
                      <option key={suite.id} value={suite.id}>
                        {suite.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleDismiss(ticket.id)}
                    disabled={loadingTicketId === ticket.id}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleCreateTestCase(ticket.id)}
                    disabled={loadingTicketId !== null}
                  >
                    {loadingTicketId === ticket.id ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3 w-3" />
                        Create Test Case
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
