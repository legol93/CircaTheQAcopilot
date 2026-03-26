import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { CreateSuiteDialog } from "./create-suite-dialog";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: suites } = await supabase
    .from("test_suites")
    .select("*, test_cases(count)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <CreateSuiteDialog projectId={id} />
      </div>

      {!suites || suites.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No test suites yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first test suite to organize your test cases
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <Link
              key={suite.id}
              href={`/dashboard/projects/${id}/suites/${suite.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    {suite.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {(suite.test_cases as { count: number }[])?.[0]?.count ?? 0} test cases
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
