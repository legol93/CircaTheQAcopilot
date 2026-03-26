"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";

interface EditableCardProps {
  testCaseId: string;
  field: "description" | "preconditions";
  label: string;
  value: string | null;
}

export function EditableCard({ testCaseId, field, label, value }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [editing]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("test_cases")
      .update({ [field]: text.trim() || null })
      .eq("id", testCaseId);

    if (!error) {
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  function handleCancel() {
    setText(value ?? "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && e.metaKey) handleSave();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label.toLowerCase()}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {editing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
              disabled={saving}
              aria-label="Save"
            >
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
              disabled={saving}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="text-sm"
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        ) : (
          <p
            className="text-sm whitespace-pre-wrap cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50 transition-colors"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {value || <span className="text-muted-foreground italic">Click to add {label.toLowerCase()}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
