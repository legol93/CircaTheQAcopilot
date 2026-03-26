import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

const RequestSchema = z.object({
  testCaseId: z.string().uuid(),
});

const ImprovedSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  preconditions: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  steps: z.array(z.object({
    step_number: z.number().int().min(1),
    action: z.string().min(1),
    expected_result: z.string().min(1),
  })).min(1).max(15),
});

const SYSTEM_PROMPT = `You are a senior QA engineer improving an existing test case. You will receive the current test case with its title, description, preconditions, and steps.

Your job:
1. Improve the title to be more specific and descriptive
2. Enhance the description to clearly explain what is being tested and why
3. Add or improve preconditions to be realistic and complete
4. Improve existing steps: make actions more specific, expected results more verifiable
5. Add missing steps for edge cases, validation, and error scenarios
6. Ensure steps cover the happy path AND at least one negative/edge case

Output ONLY valid JSON, no markdown, no explanation. Schema:
{
  "title": "string",
  "description": "string",
  "preconditions": "string",
  "priority": "low|medium|high|critical",
  "steps": [{"step_number": 1, "action": "string", "expected_result": "string"}]
}

Rules:
- Keep the original intent of the test case
- Use clear, imperative language ("Click...", "Enter...", "Verify...")
- Each step must be atomic and independently verifiable
- Expected results must be specific and measurable
- 5-12 steps is ideal`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { testCaseId } = parsed.data;

    // Fetch current test case
    const { data: testCase, error: tcError } = await supabase
      .from("test_cases")
      .select("*")
      .eq("id", testCaseId)
      .single();

    if (tcError || !testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    // Fetch current steps
    const { data: steps } = await supabase
      .from("test_steps")
      .select("*")
      .eq("test_case_id", testCaseId)
      .order("step_number", { ascending: true });

    // Build the prompt with current data
    const currentSteps = (steps ?? [])
      .map((s) => `  ${s.step_number}. Action: ${s.action} | Expected: ${s.expected_result}`)
      .join("\n");

    const userMessage = `Current test case:

Title: ${testCase.title}
Description: ${testCase.description || "(empty)"}
Preconditions: ${testCase.preconditions || "(empty)"}
Priority: ${testCase.priority}
Steps:
${currentSteps || "(no steps)"}

Improve this test case. Keep the original intent but make it more thorough, specific, and professional.`;

    // Call Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    // Strip markdown fences
    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const improved = ImprovedSchema.safeParse(JSON.parse(rawText));
    if (!improved.success) {
      return NextResponse.json({ error: "AI response failed validation" }, { status: 500 });
    }

    // Update test case
    await supabase
      .from("test_cases")
      .update({
        title: improved.data.title,
        description: improved.data.description,
        preconditions: improved.data.preconditions,
        priority: improved.data.priority,
      })
      .eq("id", testCaseId);

    // Delete old steps and insert new ones
    await supabase
      .from("test_steps")
      .delete()
      .eq("test_case_id", testCaseId);

    await supabase
      .from("test_steps")
      .insert(improved.data.steps.map((s) => ({
        test_case_id: testCaseId,
        step_number: s.step_number,
        action: s.action,
        expected_result: s.expected_result,
        ai_generated: true,
      })));

    // Log usage
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    await supabase.from("ai_prompts_log").insert({
      user_id: user.id,
      project_id: testCase.suite_id ? null : null,
      prompt: `Improve test case: ${testCase.title}`,
      response: JSON.stringify(improved.data),
      model: "claude-haiku-4-5-20251001",
      tokens_used: totalTokens,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("improve-test-case error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
