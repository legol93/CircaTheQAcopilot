"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { z } from "zod/v4";

const testCaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional(),
  preconditions: z.string().max(2000, "Preconditions is too long").optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

interface CreateTestCaseDialogProps {
  suiteId: string;
}

export function CreateTestCaseDialog({ suiteId }: CreateTestCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setPreconditions("");
      setPriority("medium");
      setError(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = testCaseSchema.safeParse({
      title,
      description: description || undefined,
      preconditions: preconditions || undefined,
      priority,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("test_cases").insert({
      suite_id: suiteId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      preconditions: parsed.data.preconditions || null,
      priority: parsed.data.priority,
      created_by: user.id,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setOpen(false);
      setTitle("");
      setDescription("");
      setPreconditions("");
      setPriority("medium");
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />New Test Case</Button>} />
      <DialogContent className="max-w-lg">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Add a new test case
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tc-title">Title</Label>
              <Input
                id="tc-title"
                placeholder="User can login with valid credentials"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tc-desc">Description</Label>
              <Textarea
                id="tc-desc"
                placeholder="What this test case verifies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tc-pre">Preconditions</Label>
              <Textarea
                id="tc-pre"
                placeholder="User must have an active account..."
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
