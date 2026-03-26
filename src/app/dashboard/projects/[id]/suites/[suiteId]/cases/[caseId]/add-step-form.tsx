"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddStepFormProps {
  testCaseId: string;
  nextStepNumber: number;
}

export function AddStepForm({ testCaseId, nextStepNumber }: AddStepFormProps) {
  const [action, setAction] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("test_steps").insert({
      test_case_id: testCaseId,
      step_number: nextStepNumber,
      action,
      expected_result: expectedResult,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setAction("");
      setExpectedResult("");
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleAdd} className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">Add Step #{nextStepNumber}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="action">Action</Label>
          <Input
            id="action"
            placeholder="Click the login button"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expected">Expected Result</Label>
          <Input
            id="expected"
            placeholder="User is redirected to dashboard"
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            required
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" size="sm" className="mt-3" disabled={loading}>
        <Plus className="mr-2 h-4 w-4" />
        {loading ? "Adding..." : "Add Step"}
      </Button>
    </form>
  );
}
