"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Bug,
  ExternalLink,
  Pencil,
  Check,
  X,
  Trash2,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateInJiraDialog } from "./create-in-jira-dialog";

interface Ticket {
  id: string;
  project_id: string;
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
  created_at: string;
  updated_at: string;
}

const severityClass: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border border-red-200",
  high: "bg-orange-100 text-orange-800 border border-orange-200",
  medium: "bg-blue-100 text-blue-800 border border-blue-200",
  low: "bg-slate-100 text-slate-800 border border-slate-200",
};

const statusClass: Record<string, string> = {
  open: "bg-red-100 text-red-800 border border-red-200",
  in_progress: "bg-blue-100 text-blue-800 border border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  closed: "bg-slate-100 text-slate-800 border border-slate-200",
};

export function BugTicketDetail({ ticket: initial }: { ticket: Ticket }) {
  const [ticket, setTicket] = useState(initial);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function saveField(field: string, value: string) {
    setSaving(true);
    const { error } = await supabase
      .from("bug_tickets")
      .update({ [field]: value.trim() || null })
      .eq("id", ticket.id);

    if (!error) {
      setTicket((prev) => ({ ...prev, [field]: value.trim() || null }));
      setEditingField(null);
    }
    setSaving(false);
  }

  function startEdit(field: string, currentValue: string | null) {
    setEditingField(field);
    setEditValue(currentValue ?? "");
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  async function updateStatus(newStatus: string) {
    await supabase.from("bug_tickets").update({ status: newStatus }).eq("id", ticket.id);
    setTicket((prev) => ({ ...prev, status: newStatus }));
  }

  async function updateSeverity(newSeverity: string) {
    await supabase.from("bug_tickets").update({ severity: newSeverity }).eq("id", ticket.id);
    setTicket((prev) => ({ ...prev, severity: newSeverity }));
  }

  async function updateEnvironment(newEnv: string) {
    await supabase.from("bug_tickets").update({ environment: newEnv }).eq("id", ticket.id);
    setTicket((prev) => ({ ...prev, environment: newEnv }));
  }

  async function handleDelete() {
    await supabase.from("bug_tickets").delete().eq("id", ticket.id);
    router.push("/dashboard/bug-tickets");
  }

  async function handleImproveWithAI() {
    if (!ticket.steps_to_reproduce || !ticket.actual_result || !ticket.expected_result) return;
    setImproving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/improve-bug-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ticket.title,
          stepsToReproduce: ticket.steps_to_reproduce,
          actualResult: ticket.actual_result,
          expectedResult: ticket.expected_result,
        }),
      });
      if (!res.ok) throw new Error("AI improvement failed");
      const data = await res.json();

      // Save all improved fields
      const updates: Record<string, string> = {};
      if (data.title) updates.title = data.title;
      if (data.stepsToReproduce) updates.steps_to_reproduce = data.stepsToReproduce;
      if (data.actualResult) updates.actual_result = data.actualResult;
      if (data.expectedResult) updates.expected_result = data.expectedResult;

      await supabase.from("bug_tickets").update(updates).eq("id", ticket.id);
      setTicket((prev) => ({ ...prev, ...updates }));
    } catch {
      setError("Failed to improve with AI");
    } finally {
      setImproving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bug-tickets">
            <Button variant="ghost" size="icon" aria-label="Back to bug tickets">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Bug className="h-5 w-5 text-muted-foreground" />
          <div>
            <EditableText
              value={ticket.title}
              onSave={(v) => saveField("title", v)}
              className="text-2xl font-bold"
            />
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              Created {new Date(ticket.created_at).toLocaleDateString()} at{" "}
              {new Date(ticket.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImproveWithAI}
            disabled={improving || !ticket.steps_to_reproduce}
            className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {improving ? "Improving..." : "Improve with AI"}
          </Button>
          {!ticket.jira_key && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJiraDialogOpen(true)}
              className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Create in Jira
            </Button>
          )}
          {ticket.jira_key && (
            <a href={ticket.jira_url ?? "#"} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                {ticket.jira_key}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      {/* Metadata row */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status:</span>
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value)}
            className={cn("h-6 cursor-pointer appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium", statusClass[ticket.status])}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Severity:</span>
          <select
            value={ticket.severity}
            onChange={(e) => updateSeverity(e.target.value)}
            className={cn("h-6 cursor-pointer appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium", severityClass[ticket.severity])}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Environment:</span>
          <select
            value={ticket.environment ?? "QA"}
            onChange={(e) => updateEnvironment(e.target.value)}
            className="h-6 cursor-pointer appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium bg-background"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
          >
            <option value="DEV">DEV</option>
            <option value="QA">QA</option>
            <option value="STAGING">STAGING</option>
            <option value="PROD">PROD</option>
          </select>
        </div>
        {ticket.bug_type && (
          <Badge variant="outline" className="rounded-full text-xs">
            {ticket.bug_type === "related_ticket" ? "Related Ticket" : "Smoke/Regression"}
          </Badge>
        )}
        {ticket.labels && (
          <div className="flex gap-1">
            {ticket.labels.split(",").map((l) => (
              <Badge key={l.trim()} variant="secondary" className="rounded-full text-xs">
                {l.trim()}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content sections */}
      <div className="mt-6 grid gap-4">
        <BugStepsEditor bugTicketId={ticket.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          <EditableCard
            title="Actual Result"
            value={ticket.actual_result}
            field="actual_result"
            onSave={(v) => saveField("actual_result", v)}
            placeholder="What actually happened..."
            rows={3}
          />
          <EditableCard
            title="Expected Result"
            value={ticket.expected_result}
            field="expected_result"
            onSave={(v) => saveField("expected_result", v)}
            placeholder="What should have happened..."
            rows={3}
          />
        </div>
        <EditableCard
          title="Description / Additional Notes"
          value={ticket.description}
          field="description"
          onSave={(v) => saveField("description", v)}
          placeholder="Any additional context..."
          rows={4}
        />
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bug Ticket</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{ticket.title}&quot;? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create in Jira dialog */}
      <CreateInJiraDialog
        ticket={ticket}
        open={jiraDialogOpen}
        onOpenChange={setJiraDialogOpen}
        onCreated={(issueKey, issueUrl) => {
          setTicket((prev) => ({ ...prev, jira_key: issueKey, jira_url: issueUrl }));
        }}
      />
    </div>
  );
}

/* ─── Bug Steps Editor ───────────────────────────────────── */

function BugStepsEditor({ bugTicketId }: { bugTicketId: string }) {
  const [steps, setSteps] = useState<{ id: string; step_number: number; description: string }[]>([]);
  const [newStep, setNewStep] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSteps = useCallback(async () => {
    const { data } = await supabase
      .from("bug_ticket_steps")
      .select("*")
      .eq("bug_ticket_id", bugTicketId)
      .order("step_number", { ascending: true });
    setSteps(data ?? []);
    setLoading(false);
  }, [bugTicketId, supabase]);

  useState(() => { fetchSteps(); });

  async function addStep() {
    const trimmed = newStep.trim();
    if (!trimmed) return;
    const nextNum = (steps.length > 0 ? Math.max(...steps.map((s) => s.step_number)) : 0) + 1;
    await supabase.from("bug_ticket_steps").insert({
      bug_ticket_id: bugTicketId,
      step_number: nextNum,
      description: trimmed,
    });
    setNewStep("");
    fetchSteps();
  }

  async function deleteStep(stepId: string) {
    await supabase.from("bug_ticket_steps").delete().eq("id", stepId);
    fetchSteps();
  }

  async function saveEdit(stepId: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await supabase.from("bug_ticket_steps").update({ description: trimmed }).eq("id", stepId);
    setEditingId(null);
    fetchSteps();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Steps to Reproduce</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : steps.length === 0 && !newStep ? (
          <p className="text-sm text-muted-foreground italic">No steps added yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 group"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step.step_number}
                </span>
                {editingId === step.id ? (
                  <div className="flex-1 flex items-start gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(step.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveEdit(step.id)}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm pt-0.5">{step.description}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => { setEditingId(step.id); setEditValue(step.description); }}
                        aria-label="Edit step"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteStep(step.id)}
                        aria-label="Delete step"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new step */}
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
            {steps.length + 1}
          </span>
          <Input
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addStep(); }}
            placeholder="Add a step and press Enter..."
            className="flex-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addStep}
            disabled={!newStep.trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Editable Text (inline) ─────────────────────────────── */

function EditableText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function handleSave() {
    if (text.trim() && text.trim() !== value) onSave(text.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setText(value); setEditing(false); }
        }}
        autoFocus
        className={cn("bg-transparent outline-none ring-1 ring-primary/50 rounded px-1 -mx-1 w-full", className)}
      />
    );
  }

  return (
    <span
      onClick={() => { setText(value); setEditing(true); }}
      className={cn("cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors", className)}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

/* ─── Editable Card ──────────────────────────────────────── */

function EditableCard({
  title,
  value,
  field,
  onSave,
  placeholder,
  rows = 3,
}: {
  title: string;
  value: string | null;
  field: string;
  onSave: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    onSave(text);
    setEditing(false);
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setText(value ?? ""); setEditing(true); }}
            aria-label={`Edit ${title}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {editing && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && e.metaKey) handleSave();
            }}
          />
        ) : (
          <p
            className="text-sm whitespace-pre-wrap cursor-pointer rounded p-1 -m-1 hover:bg-muted/50 transition-colors min-h-[2rem]"
            onClick={() => { setText(value ?? ""); setEditing(true); }}
          >
            {value || <span className="text-muted-foreground italic">Click to add {title.toLowerCase()}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
