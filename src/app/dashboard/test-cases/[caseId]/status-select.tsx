"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusBadgeClass, priorityBadgeClass } from "@/lib/badge-variants";
import { cn } from "@/lib/utils";

interface StatusSelectProps {
  testCaseId: string;
  currentStatus: string;
  currentPriority: string;
}

const statuses = ["draft", "active", "deprecated"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;

export function StatusSelect({ testCaseId, currentStatus, currentPriority }: StatusSelectProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function updateField(field: string, value: string) {
    setSaving(true);
    await supabase
      .from("test_cases")
      .update({ [field]: value })
      .eq("id", testCaseId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentStatus}
        onChange={(e) => updateField("status", e.target.value)}
        disabled={saving}
        aria-label="Change status"
        className={cn(
          "h-6 cursor-pointer appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary",
          statusBadgeClass[currentStatus]
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>

      <select
        value={currentPriority}
        onChange={(e) => updateField("priority", e.target.value)}
        disabled={saving}
        aria-label="Change priority"
        className={cn(
          "h-6 cursor-pointer appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary",
          priorityBadgeClass[currentPriority]
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
      >
        {priorities.map((p) => (
          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}
