"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface Step {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
}

interface EditableStepsTableProps {
  steps: Step[];
}

export function EditableStepsTable({ steps }: EditableStepsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAction, setEditAction] = useState("");
  const [editExpected, setEditExpected] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Step | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function startEdit(step: Step) {
    setEditingId(step.id);
    setEditAction(step.action);
    setEditExpected(step.expected_result);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAction("");
    setEditExpected("");
  }

  async function saveEdit(stepId: string) {
    const trimmedAction = editAction.trim();
    const trimmedExpected = editExpected.trim();
    if (!trimmedAction || !trimmedExpected) return;

    setLoading(true);
    const { error } = await supabase
      .from("test_steps")
      .update({ action: trimmedAction, expected_result: trimmedExpected })
      .eq("id", stepId);

    if (!error) {
      setEditingId(null);
      router.refresh();
    }
    setLoading(false);
  }

  async function deleteStep(stepId: string) {
    setLoading(true);
    const { error } = await supabase
      .from("test_steps")
      .delete()
      .eq("id", stepId);

    if (!error) {
      router.refresh();
    }
    setDeleteTarget(null);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent, stepId: string) {
    if (e.key === "Escape") {
      cancelEdit();
    } else if (e.key === "Enter" && e.metaKey) {
      saveEdit(stepId);
    }
  }

  return (
    <div className="mt-4 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 border-r">#</TableHead>
            <TableHead className="w-[42%] border-r">Action</TableHead>
            <TableHead className="w-[42%] border-r">Expected Result</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step) => (
            <TableRow key={step.id}>
              <TableCell className="font-medium align-top border-r">
                {step.step_number}
              </TableCell>

              {editingId === step.id ? (
                <>
                  <TableCell className="border-r">
                    <Textarea
                      value={editAction}
                      onChange={(e) => setEditAction(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, step.id)}
                      rows={2}
                      className="text-sm"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell className="border-r">
                    <Textarea
                      value={editExpected}
                      onChange={(e) => setEditExpected(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, step.id)}
                      rows={2}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveEdit(step.id)}
                        disabled={loading}
                        aria-label="Save step"
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                        disabled={loading}
                        aria-label="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="whitespace-pre-wrap align-top border-r">
                    {step.action}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap align-top border-r">
                    {step.expected_result}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(step)}
                        aria-label="Edit step"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteTarget(step)}
                        disabled={loading}
                        aria-label="Delete step"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete step #{deleteTarget?.step_number}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={loading} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => {
                if (deleteTarget) deleteStep(deleteTarget.id);
              }}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
