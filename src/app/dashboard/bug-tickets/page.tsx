import { createClient } from "@/lib/supabase/server";
import { BugTicketsList } from "./bug-tickets-list";

export default async function BugTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's project
  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .limit(1)
    .single();

  if (!project) {
    await supabase.from("projects").insert({ name: "Default", created_by: user.id });
    const { data: newProject } = await supabase.from("projects").select("id").limit(1).single();
    project = newProject;
  }

  return <BugTicketsList projectId={project?.id ?? ""} />;
}
