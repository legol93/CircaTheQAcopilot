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

const SYSTEM_PROMPT = `Senior QA engineer. Improve bug ticket: title (specific, include feature/area), steps (atomic, numbered, exact), actual result (precise, errors), expected result (specific behavior).
Output JSON only: {title, stepsToReproduce, actualResult, expectedResult}. Keep original intent, professional language, concise.`;

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
      max_tokens: 1000,
      temperature: 0.3,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
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

    const ImprovedSchema = z.object({
      title: z.string().min(1),
      stepsToReproduce: z.string().min(1),
      actualResult: z.string().min(1),
      expectedResult: z.string().min(1),
    });

    const parsed_improved = ImprovedSchema.safeParse(JSON.parse(rawText));
    if (!parsed_improved.success) {
      return NextResponse.json({ error: "AI response failed validation" }, { status: 500 });
    }
    const improved = parsed_improved.data;

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
