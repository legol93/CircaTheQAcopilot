import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  pendingTicketId: z.string().uuid("Invalid pendingTicketId"),
});

// ---------------------------------------------------------------------------
// POST /api/jira/dismiss
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

    const { pendingTicketId } = parsed.data;

    // 3. Update pending ticket to dismissed (RLS ensures user can only update their own)
    const { error: updateError, count } = await supabase
      .from("jira_pending_tickets")
      .update({ status: "dismissed" })
      .eq("id", pendingTicketId)
      .eq("status", "pending");

    if (updateError) {
      console.error("Failed to dismiss ticket:", updateError.message);
      return NextResponse.json(
        { error: "Failed to dismiss ticket" },
        { status: 500 },
      );
    }

    if (count === 0) {
      // Either not found (RLS filtered) or already processed
      return NextResponse.json(
        { error: "Ticket not found or already processed" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("dismiss error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
