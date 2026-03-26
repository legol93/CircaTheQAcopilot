import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Schema for the AI-generated test case
// ---------------------------------------------------------------------------

const TestStepSchema = z.object({
  step_number: z.number().int().min(1),
  action: z.string().min(1),
  expected_result: z.string().min(1),
});

const GeneratedTestCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  preconditions: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  steps: z.array(TestStepSchema).min(3).max(8),
});

export type GeneratedTestCase = z.infer<typeof GeneratedTestCaseSchema>;

// ---------------------------------------------------------------------------
// Map Jira priority labels to our internal priority
// ---------------------------------------------------------------------------

function mapJiraPriority(jiraPriority: string): string {
  const normalized = jiraPriority.toLowerCase();
  if (normalized === "highest" || normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low" || normalized === "lowest") return "low";
  // Default fallback
  return "medium";
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a QA engineer generating test cases. Given a Jira ticket, produce a comprehensive test case.
Output ONLY valid JSON, no markdown, no explanation.
Schema: { title: string, description: string, preconditions: string, priority: "low"|"medium"|"high"|"critical", steps: [{ step_number: number, action: string, expected_result: string }] }
Rules: 3-8 steps, atomic and verifiable, include happy path and edge cases, imperative language.`;

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateTestCase(
  title: string,
  description: string,
  issueType: string,
  priority: string,
): Promise<GeneratedTestCase> {
  const anthropic = new Anthropic();

  const mappedPriority = mapJiraPriority(priority);

  const userMessage = `Jira Ticket: ${title}
Type: ${issueType}
Priority: ${mappedPriority}
Title: ${title}
Description:
${description}

Generate a test case.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Strip markdown code fences if present (```json ... ```)
  let rawText = textBlock.text.trim();
  if (rawText.startsWith("```")) {
    rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Parse the JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${rawText.slice(0, 200)}`);
  }

  // Validate with Zod
  const result = GeneratedTestCaseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `AI response failed validation: ${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }

  // Override priority with mapped Jira priority (AI may have returned something else)
  return {
    ...result.data,
    priority: result.data.priority,
  };
}
