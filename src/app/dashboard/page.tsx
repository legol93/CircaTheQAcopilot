import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, FileText, PlayCircle, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [casesResult, aiCasesResult, runsResult, passedResult, failedResult] =
    await Promise.all([
      supabase.from("test_cases").select("*", { count: "exact", head: true }),
      supabase.from("test_cases").select("*", { count: "exact", head: true }).eq("ai_generated", true),
      supabase.from("test_runs").select("*", { count: "exact", head: true }),
      supabase
        .from("test_run_results")
        .select("*", { count: "exact", head: true })
        .eq("status", "passed"),
      supabase
        .from("test_run_results")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed"),
    ]);

  const caseCount = casesResult.count;
  const aiCaseCount = aiCasesResult.count;
  const runCount = runsResult.count;
  const passedCount = passedResult.count;
  const failedCount = failedResult.count;

  const stats = [
    {
      title: "Test Cases",
      value: caseCount ?? 0,
      icon: FileText,
      href: "/dashboard/test-cases",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-l-indigo-500",
      bgIcon: "bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      title: "AI Generated",
      value: aiCaseCount ?? 0,
      icon: Sparkles,
      href: "/dashboard/test-cases",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-l-purple-500",
      bgIcon: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      title: "Test Runs",
      value: runCount ?? 0,
      icon: PlayCircle,
      href: "/dashboard/runs",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-l-blue-500",
      bgIcon: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "Passed",
      value: passedCount ?? 0,
      icon: CheckCircle,
      href: "/dashboard/runs",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-l-emerald-500",
      bgIcon: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "Failed",
      value: failedCount ?? 0,
      icon: XCircle,
      href: "/dashboard/runs",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-l-red-500",
      bgIcon: "bg-red-50 dark:bg-red-950/50",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your testing activity
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className={`border-l-4 ${stat.borderColor} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgIcon}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
