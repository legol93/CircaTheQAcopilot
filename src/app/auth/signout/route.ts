import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  const { origin } = new URL(request.url);

  if (error) {
    console.error("Sign out error:", error.message);
    // Redirect to login anyway — user likely wants to leave
  }

  return NextResponse.redirect(`${origin}/auth/login`, { status: 302 });
}
