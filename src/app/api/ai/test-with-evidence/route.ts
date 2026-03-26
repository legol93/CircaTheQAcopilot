import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a QA engineer analyzing screenshots/images as evidence for a test case execution. Compare what you see in the images against the expected test steps.

For each step, determine if the evidence shows it passing, failing, or if you can't tell (inconclusive).

Output ONLY valid JSON:
{
  "verdict": "pass" | "fail" | "inconclusive",
  "summary": "1-2 sentence overall assessment",
  "step_results": [
    {"step_number": 1, "status": "pass|fail|inconclusive", "observation": "what you see in the evidence"}
  ],
  "recommendations": "optional suggestions for improvement"
}

Rules:
- Be objective — only report what you can actually see in the images
- If a step can't be verified from the images, mark it as "inconclusive"
- Overall verdict is "fail" if ANY step fails
- Overall verdict is "pass" only if ALL verifiable steps pass
- Keep observations concise but specific`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { testCaseId, testTitle, steps, evidence, notes } = body;

    if (!evidence || evidence.length === 0) {
      return NextResponse.json({ error: "No evidence provided" }, { status: 400 });
    }

    // Build the user message with images and steps
    const stepsText = steps
      .map((s: { step_number: number; action: string; expected_result: string }) =>
        `Step ${s.step_number}: Action: ${s.action} | Expected: ${s.expected_result}`
      )
      .join("\n");

    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add images
    for (const img of evidence) {
      if (img.type === "image") {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.media_type,
            data: img.data,
          },
        });
      }
    }

    // Add text prompt
    content.push({
      type: "text",
      text: `Test Case: ${testTitle}\n\nSteps to verify:\n${stepsText}${notes ? `\n\nAdditional context: ${notes}` : ""}\n\nAnalyze the uploaded screenshots against these test steps. What passes, what fails?`,
    });

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const result = JSON.parse(rawText);

    // Log usage
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    await supabase.from("ai_prompts_log").insert({
      user_id: user.id,
      prompt: `Test with AI: ${testTitle} (${evidence.length} images)`,
      response: JSON.stringify(result),
      model: "claude-haiku-4-5-20251001",
      tokens_used: totalTokens,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("test-with-evidence error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
