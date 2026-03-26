"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  jira_key: string;
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
        body: JSON.stringify({ pendingTicketId: ticketId, suiteId }),
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
    <div className="mx-6 mt-4 rounded-lg border border-l-4 border-l-blue-500 bg-background">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <svg
          className="h-5 w-5 shrink-0 text-blue-600"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.34 4.34h1.8v1.72A4.35 4.35 0 0 0 12.48 22v-9.56a.84.84 0 0 0-.84-.84H2Z" />
        </svg>
        <span className="text-sm font-semibold">
          Jira Tickets Ready for Testing
        </span>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          {tickets.length}
        </Badge>
        <span className="ml-auto">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="border-t px-4 pb-3">
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-2 divide-y">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={
                        ticket.jira_url ??
                        `https://jira.atlassian.net/browse/${ticket.jira_key}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {ticket.jira_key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-sm text-foreground">
                      {ticket.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {ticket.issue_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedSuites[ticket.id] ?? undefined}
                    onValueChange={(v) =>
                      v &&
                      setSelectedSuites((prev) => ({
                        ...prev,
                        [ticket.id]: v,
                      }))
                    }
                  >
                    <SelectTrigger size="sm" aria-label="Select destination suite">
                      <SelectValue placeholder="Select suite" />
                    </SelectTrigger>
                    <SelectContent>
                      {suites.map((suite) => (
                        <SelectItem key={suite.id} value={suite.id}>
                          {suite.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(ticket.id)}
                    disabled={loadingTicketId === ticket.id}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
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
