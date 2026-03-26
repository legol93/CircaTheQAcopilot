"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateFolderDialogProps {
  projectId: string | null;
}

export function CreateFolderDialog({ projectId }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setName("");
      setError(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError("Create a project first");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
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

    const { error } = await supabase.from("test_suites").insert({
      project_id: projectId,
      name: trimmedName,
      type: "folder",
      created_by: user.id,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setOpen(false);
      setName("");
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            className="rounded p-0.5 hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
            aria-label="Create new folder"
          >
            <Plus className="h-3 w-3" />
          </button>
        }
      />
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                placeholder="Smoke Tests"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
