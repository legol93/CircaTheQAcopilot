import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

const RequestSchema = z.object({
  title: z.string().min(1),
  stepsToReproduce: z.string().optional().default(""),
  actualResult: z.string().optional().default(""),
  expectedResult: z.string().optional().default(""),
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server" },
        { status: 503 },
      );
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed_json: any;
    try {
      parsed_json = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 },
      );
    }

    // Normalize keys — Claude may return camelCase or snake_case
    const improved = {
      title: parsed_json.title ?? "",
      stepsToReproduce:
        parsed_json.stepsToReproduce ??
        parsed_json.steps_to_reproduce ??
        parsed_json.steps ??
        "",
      actualResult:
        parsed_json.actualResult ??
        parsed_json.actual_result ??
        "",
      expectedResult:
        parsed_json.expectedResult ??
        parsed_json.expected_result ??
        "",
    };

    if (!improved.title || !improved.stepsToReproduce || !improved.actualResult || !improved.expectedResult) {
      return NextResponse.json(
        { error: "AI response missing required fields" },
        { status: 500 },
      );
    }

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
    const message = error instanceof Error ? error.message : "Failed to improve bug ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
