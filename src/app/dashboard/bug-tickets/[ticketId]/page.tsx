import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BugTicketDetail } from "./bug-ticket-detail";

export default async function BugTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("bug_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) notFound();

  return <BugTicketDetail ticket={ticket} />;
}
