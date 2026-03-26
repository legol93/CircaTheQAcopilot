"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface ImproveWithAiProps {
  testCaseId: string;
}

export function ImproveWithAi({ testCaseId }: ImproveWithAiProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImprove() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/improve-test-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to improve test case");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to improve");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleImprove}
        disabled={loading}
        className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Improving...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Improve with AI
          </>
        )}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
