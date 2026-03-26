"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface EditableSuiteNameProps {
  suiteId: string;
  name: string;
  className?: string;
}

export function EditableSuiteName({ suiteId, name, className }: EditableSuiteNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      setEditing(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("test_suites")
      .update({ name: trimmed })
      .eq("id", suiteId);

    if (!error) {
      setEditing(false);
      router.refresh();
    } else {
      setValue(name);
      setEditing(false);
    }
    setSaving(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(name);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={cn(
          "truncate bg-transparent outline-none ring-1 ring-primary/50 rounded px-1 -mx-1 text-sm",
          className
        )}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn("truncate cursor-text", className)}
      title="Double-click to rename"
    >
      {name}
    </span>
  );
}
