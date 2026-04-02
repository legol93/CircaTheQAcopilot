"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Loader2, Sparkles, X, ArrowRight } from "lucide-react";
import type { JiraPendingTicket } from "@/types/database";

type FilterTab = "all" | "needs_action" | "created";

interface JiraDraftsTableProps {
  initialTickets: JiraPendingTicket[];
  suites: { id: string; name: string }[];
}

export function JiraDraftsTable({
  initialTickets,
  suites,
}: JiraDraftsTableProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [selectedSuites, setSelectedSuites] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const router = useRouter();

  const needsAction = tickets.filter(
    (t) => t.status === "pending" || t.status === "dismissed"
  );
  const completed = tickets.filter((t) => t.status === "created");

  const showNeedsAction = filter === "all" || filter === "needs_action";
  const showCompleted = filter === "all" || filter === "created";

  async function handleDismiss(ticketId: string) {
    setError(null);
    setDismissingId(ticketId);
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

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: "dismissed" as const } : t
        )
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to dismiss ticket"
      );
    } finally {
      setDismissingId(null);
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
        body: JSON.stringify({
          pendingTicketId: ticketId,
          targetSuiteId: suiteId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate test case");
      }

      const { testCaseId } = await res.json();

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: "created" as const,
                created_test_case_id: testCaseId,
              }
            : t
        )
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate test case"
      );
    } finally {
      setLoadingTicketId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Filter Tabs */}
      <div role="tablist" className="flex flex-wrap items-center gap-2">
        <button
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 h-7 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-input bg-background hover:bg-muted"
          }`}
        >
          All
          <Badge
            variant="secondary"
            className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {tickets.length}
          </Badge>
        </button>
        <button
          role="tab"
          aria-selected={filter === "needs_action"}
          onClick={() => setFilter("needs_action")}
          className={`rounded-full px-3 h-7 text-xs font-medium transition-colors ${
            filter === "needs_action"
              ? "bg-primary text-primary-foreground"
              : "border border-input bg-background hover:bg-muted"
          }`}
        >
          Needs Action
          <Badge
            variant="secondary"
            className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {needsAction.length}
          </Badge>
        </button>
        <button
          role="tab"
          aria-selected={filter === "created"}
          onClick={() => setFilter("created")}
          className={`rounded-full px-3 h-7 text-xs font-medium transition-colors ${
            filter === "created"
              ? "bg-primary text-primary-foreground"
              : "border border-input bg-background hover:bg-muted"
          }`}
        >
          Created
          <Badge
            variant="secondary"
            className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {completed.length}
          </Badge>
        </button>
      </div>

      {/* Needs Action Section */}
      {showNeedsAction && needsAction.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Needs Action</h2>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {needsAction.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {needsAction.map((ticket) => (
              <Card
                key={ticket.id}
                className={`border-l-4 ${
                  ticket.status === "pending"
                    ? "border-l-blue-500"
                    : "border-l-gray-400"
                }`}
              >
                <CardContent className="py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Info */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={
                            ticket.jira_url ??
                            `https://jira.atlassian.net/browse/${ticket.jira_issue_key}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                        >
                          {ticket.jira_issue_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline" className="text-xs">
                          {ticket.issue_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ticket.priority}
                        </Badge>
                        {ticket.status === "dismissed" && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            Dismissed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <Select
                        value={selectedSuites[ticket.id] ?? ""}
                        onValueChange={(v) =>
                          v &&
                          setSelectedSuites((prev) => ({
                            ...prev,
                            [ticket.id]: v,
                          }))
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="min-w-[140px] text-xs"
                        >
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
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismiss(ticket.id)}
                        disabled={
                          dismissingId === ticket.id ||
                          loadingTicketId === ticket.id
                        }
                        aria-label="Dismiss ticket"
                      >
                        {dismissingId === ticket.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {showCompleted && completed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Completed</h2>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {completed.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {completed.map((ticket) => (
              <Card
                key={ticket.id}
                className="border-l-4 border-l-emerald-500 opacity-80"
              >
                <CardContent className="py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Info */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={
                            ticket.jira_url ??
                            `https://jira.atlassian.net/browse/${ticket.jira_issue_key}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                        >
                          {ticket.jira_issue_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline" className="text-xs">
                          {ticket.issue_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ticket.priority}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        >
                          Created
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Right: Link */}
                    {ticket.created_test_case_id && (
                      <Link
                        href={`/dashboard/test-cases/${ticket.created_test_case_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline sm:flex-shrink-0"
                      >
                        View test case
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {((showNeedsAction && needsAction.length === 0 && filter === "needs_action") ||
        (showCompleted && completed.length === 0 && filter === "created") ||
        (tickets.length === 0 && filter === "all")) && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "all" && tickets.length === 0 && "No Jira tickets yet"}
            {filter === "needs_action" &&
              needsAction.length === 0 &&
              "No tickets need action"}
            {filter === "created" &&
              completed.length === 0 &&
              "No tickets created yet"}
          </p>
        </div>
      )}
    </div>
  );
}
