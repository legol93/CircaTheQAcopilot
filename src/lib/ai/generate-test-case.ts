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

export type GeneratedTestCase = z.infer<typeof GeneratedTestCaseSchema> & {
  _usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    model: string;
  };
};

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

const SYSTEM_PROMPT = `QA engineer. Generate test case from Jira ticket. Output JSON only, no markdown:
{title, description, preconditions, priority: "low"|"medium"|"high"|"critical", steps: [{step_number, action, expected_result}]}
3-8 atomic steps. Happy path + edge cases. Imperative language.`;

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateTestCase(
  title: string,
  description: string,
  issueType: string,
  priority: string,
): Promise<GeneratedTestCase> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }
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
    max_tokens: 1200,
    temperature: 0.3,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
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

  // Normalize fields before validation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = parsed as any;
  if (Array.isArray(obj.preconditions)) {
    obj.preconditions = obj.preconditions.join("\n");
  }

  // Validate with Zod
  const result = GeneratedTestCaseSchema.safeParse(obj);
  if (!result.success) {
    throw new Error(
      `AI response failed validation: ${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  return {
    ...result.data,
    priority: result.data.priority,
    _usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      model: "claude-haiku-4-5-20251001",
    },
  };
}
