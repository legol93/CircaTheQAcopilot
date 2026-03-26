"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { z } from "zod/v4";

const stepSchema = z.object({
  action: z.string().trim().min(1, "Action is required").max(1000, "Action is too long"),
  expected_result: z.string().trim().min(1, "Expected result is required").max(1000, "Expected result is too long"),
});

interface AddStepFormProps {
  testCaseId: string;
  nextStepNumber: number;
}

export function AddStepForm({ testCaseId, nextStepNumber }: AddStepFormProps) {
  const [action, setAction] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = stepSchema.safeParse({
      action,
      expected_result: expectedResult,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("test_steps").insert({
      test_case_id: testCaseId,
      step_number: nextStepNumber,
      action: parsed.data.action,
      expected_result: parsed.data.expected_result,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setAction("");
      setExpectedResult("");
      setLoading(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleAdd} className={`rounded-lg border p-4 transition-colors duration-500 ${justAdded ? "border-emerald-500" : ""}`}>
      <h3 className="text-sm font-medium">Add Step #{nextStepNumber}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="action">Action</Label>
          <Textarea
            id="action"
            rows={2}
            placeholder="Click the login button"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expected">Expected Result</Label>
          <Textarea
            id="expected"
            rows={2}
            placeholder="User is redirected to dashboard"
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            required
          />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="mt-3" disabled={loading}>
        <Plus className="mr-2 h-4 w-4" />
        {loading ? "Adding..." : "Add Step"}
      </Button>
    </form>
  );
}
