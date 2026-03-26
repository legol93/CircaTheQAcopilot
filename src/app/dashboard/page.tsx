import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, FileText, PlayCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [projectsResult, casesResult, runsResult, passedResult] =
    await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("test_cases").select("*", { count: "exact", head: true }),
      supabase.from("test_runs").select("*", { count: "exact", head: true }),
      supabase
        .from("test_run_results")
        .select("*", { count: "exact", head: true })
        .eq("status", "passed"),
    ]);

  const projectCount = projectsResult.count;
  const caseCount = casesResult.count;
  const runCount = runsResult.count;
  const passedCount = passedResult.count;

  const stats = [
    {
      title: "Projects",
      value: projectCount ?? 0,
      icon: FolderKanban,
      href: "/dashboard/test-cases",
    },
    {
      title: "Test Cases",
      value: caseCount ?? 0,
      icon: FileText,
      href: "/dashboard/test-cases",
    },
    {
      title: "Test Runs",
      value: runCount ?? 0,
      icon: PlayCircle,
      href: "/dashboard/runs",
    },
    {
      title: "Tests Passed",
      value: passedCount ?? 0,
      icon: CheckCircle,
      href: "/dashboard/runs",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your testing activity
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
