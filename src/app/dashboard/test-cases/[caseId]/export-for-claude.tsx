"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Check, FileCode } from "lucide-react";

interface ExportForClaudeProps {
  testCaseId: string;
}

export function ExportForClaude({ testCaseId }: ExportForClaudeProps) {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  async function generateExport() {
    setLoading(true);

    const { data: tc } = await supabase
      .from("test_cases")
      .select("*, test_suites(name)")
      .eq("id", testCaseId)
      .single();

    const { data: steps } = await supabase
      .from("test_steps")
      .select("*")
      .eq("test_case_id", testCaseId)
      .order("step_number", { ascending: true });

    if (!tc) {
      setLoading(false);
      return;
    }

    const suiteName = (tc.test_suites as { name: string })?.name ?? "Unknown";

    const stepsText = (steps ?? [])
      .map(
        (s) =>
          `  Step ${s.step_number}:\n    Action: ${s.action}\n    Expected Result: ${s.expected_result}`
      )
      .join("\n\n");

    const exportText = `<test-case>
  <id>${tc.id}</id>
  <title>${tc.title}</title>
  <suite>${suiteName}</suite>
  <priority>${tc.priority}</priority>
  <status>${tc.status}</status>
  <description>${tc.description ?? "N/A"}</description>
  <preconditions>${tc.preconditions ?? "N/A"}</preconditions>

  <steps>
${stepsText}
  </steps>

  <metadata>
    <ai_generated>${tc.ai_generated}</ai_generated>
    <created_at>${tc.created_at}</created_at>
  </metadata>
</test-case>

<!-- Instructions for Claude Code:
  This is a test case exported from Circa QA Copilot.
  Use this to:
  1. Write a Playwright test that automates this test case
  2. Review if the test steps are complete and correct
  3. Generate additional edge case test cases based on this one
  4. Create a bug report template if this test case fails
  5. Suggest improvements to the test case coverage
-->`;

    setOutput(exportText);
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !output) generateExport();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-cyan-200 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-300"
          >
            <FileCode className="h-3.5 w-3.5" />
            Export for Claude
          </Button>
        }
      />
      <DialogContent style={{ maxWidth: "750px", width: "90vw" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Export for Claude Code
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Copy this and paste it into Claude Code as context for automation.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!output}
              className="gap-1 shrink-0"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy</>
              )}
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Generating export...
            </div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs font-mono whitespace-pre-wrap">
              {output}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
