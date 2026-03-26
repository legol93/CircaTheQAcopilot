import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTestCase } from "@/lib/ai/generate-test-case";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  pendingTicketId: z.string().uuid("Invalid pendingTicketId"),
  targetSuiteId: z.string().uuid("Invalid targetSuiteId"),
});

// ---------------------------------------------------------------------------
// POST /api/jira/generate-test-case
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { pendingTicketId, targetSuiteId } = parsed.data;

    // 3. Fetch pending ticket (RLS will filter by user's project)
    const { data: ticket, error: ticketError } = await supabase
      .from("jira_pending_tickets")
      .select("*")
      .eq("id", pendingTicketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Pending ticket not found" },
        { status: 404 },
      );
    }

    if (ticket.status !== "pending") {
      return NextResponse.json(
        { error: "Ticket has already been processed" },
        { status: 409 },
      );
    }

    // 4. Call AI to generate test case
    const generated = await generateTestCase(
      ticket.title,
      ticket.description || "",
      ticket.issue_type || "Story",
      ticket.priority || "Medium",
    );

    // 5. Insert test_case
    const { data: testCase, error: insertCaseError } = await supabase
      .from("test_cases")
      .insert({
        suite_id: targetSuiteId,
        title: generated.title,
        description: generated.description,
        preconditions: generated.preconditions || null,
        priority: generated.priority,
        ai_generated: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertCaseError || !testCase) {
      console.error("Failed to insert test case:", insertCaseError?.message);
      return NextResponse.json(
        { error: "Failed to save test case" },
        { status: 500 },
      );
    }

    // 6. Insert test_steps
    const stepsToInsert = generated.steps.map((step) => ({
      test_case_id: testCase.id,
      step_number: step.step_number,
      action: step.action,
      expected_result: step.expected_result,
      ai_generated: true,
    }));

    const { error: insertStepsError } = await supabase
      .from("test_steps")
      .insert(stepsToInsert);

    if (insertStepsError) {
      console.error("Failed to insert test steps:", insertStepsError.message);
      // Test case was created but steps failed — still return the case id
    }

    // 7. Update pending ticket status
    const { error: updateTicketError } = await supabase
      .from("jira_pending_tickets")
      .update({
        status: "created",
        created_test_case_id: testCase.id,
      })
      .eq("id", pendingTicketId);

    if (updateTicketError) {
      console.error(
        "Failed to update pending ticket:",
        updateTicketError.message,
      );
    }

    // 8. Log in ai_prompts_log (non-critical)
    await supabase
      .from("ai_prompts_log")
      .insert({
        user_id: user.id,
        project_id: ticket.project_id,
        prompt: `Generate test case for ${ticket.jira_issue_key}: ${ticket.title}`,
        response: JSON.stringify(generated),
        model: generated._usage?.model ?? "claude-haiku-4-5-20251001",
        tokens_used: generated._usage?.total_tokens ?? null,
      })
      .then(({ error: logError }) => {
        if (logError) console.error("Failed to log AI prompt:", logError.message);
      });

    // 9. Return success
    return NextResponse.json({ testCaseId: testCase.id }, { status: 201 });
  } catch (error) {
    console.error("generate-test-case error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
