import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FolderKanban } from "lucide-react";
import { CreateProjectDialog } from "./create-project-dialog";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, test_suites(count), test_cases(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your testing projects
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {(project.test_suites as { count: number }[])?.[0]?.count ?? 0} suites
                    </span>
                    <span>
                      {(project.test_cases as { count: number }[])?.[0]?.count ?? 0} cases
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
