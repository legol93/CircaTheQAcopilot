"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface EditableTitleProps {
  testCaseId: string;
  title: string;
}

export function EditableTitle({ testCaseId, title }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
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
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("test_cases")
      .update({ title: trimmed })
      .eq("id", testCaseId);

    if (!error) {
      setEditing(false);
      router.refresh();
    } else {
      setValue(title);
      setEditing(false);
    }
    setSaving(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setValue(title);
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
        className="w-full bg-transparent text-3xl font-bold outline-none ring-1 ring-primary/50 rounded px-1 -mx-1"
      />
    );
  }

  return (
    <h1
      className="text-3xl font-bold cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit title"
    >
      {title}
    </h1>
  );
}
