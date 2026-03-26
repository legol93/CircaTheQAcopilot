import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

const RequestSchema = z.object({
  title: z.string().min(1),
  stepsToReproduce: z.string().min(1),
  actualResult: z.string().min(1),
  expectedResult: z.string().min(1),
});

const SYSTEM_PROMPT = `You are a senior QA engineer improving a bug ticket. Make it clearer, more specific, and easier for a developer to understand and fix.

Improve:
1. Title: make it specific and descriptive (include the affected feature/area)
2. Steps to Reproduce: make steps atomic, numbered, specific (include exact URLs, buttons, data if mentioned)
3. Actual Result: be precise about what happens (include error messages, visual issues)
4. Expected Result: be specific about the correct behavior

Output ONLY valid JSON:
{
  "title": "improved title",
  "stepsToReproduce": "improved steps (keep numbered format)",
  "actualResult": "improved actual result (keep bullet format)",
  "expectedResult": "improved expected result (keep bullet format)"
}

Rules:
- Keep the original intent, don't invent new information
- Use professional QA language
- Be concise but thorough`;

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

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Title: ${parsed.data.title}\n\nSteps to Reproduce:\n${parsed.data.stepsToReproduce}\n\nActual Result:\n${parsed.data.actualResult}\n\nExpected Result:\n${parsed.data.expectedResult}\n\nImprove this bug ticket.`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const improved = JSON.parse(rawText);

    // Log usage
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    await supabase.from("ai_prompts_log").insert({
      user_id: user.id,
      prompt: `Improve bug ticket: ${parsed.data.title}`,
      response: JSON.stringify(improved),
      model: "claude-haiku-4-5-20251001",
      tokens_used: totalTokens,
    });

    return NextResponse.json(improved);
  } catch (error) {
    console.error("improve-bug-ticket error:", error);
    return NextResponse.json({ error: "Failed to improve bug ticket" }, { status: 500 });
  }
}
