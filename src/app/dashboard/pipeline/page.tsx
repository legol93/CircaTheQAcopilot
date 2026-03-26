import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Palette,
  Code,
  Database,
  Cloud,
  ShieldCheck,
  FlaskConical,
  ArrowDown,
  ArrowRight,
  GitBranch,
  TrendingUp,
  User,
} from "lucide-react";

const pipelineSteps = [
  {
    phase: "1. Entry",
    title: "User Request",
    icon: User,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    description: "Feature, bug fix, o cambio de producto",
    type: "input" as const,
  },
  {
    phase: "2. Orchestration",
    title: "Orchestrator",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    description: "Analiza, clasifica y decide qué agentes invocar",
    type: "agent" as const,
  },
  {
    phase: "3. Design (optional)",
    title: "UI/UX Designer",
    icon: Palette,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    description: "Produce specs de UI si hay pantallas nuevas",
    type: "agent" as const,
  },
  {
    phase: "3b. Cost Audit (if AI involved)",
    title: "Token Money",
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    description: "Audita costos de API, optimiza prompts y selecciona modelos antes de implementar",
    type: "agent" as const,
  },
  {
    phase: "4. Implementation",
    title: "Dev Agents",
    icon: GitBranch,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    description: "Frontend + Backend + Edge Functions (paralelo si no hay dependencias)",
    type: "parallel" as const,
    subAgents: [
      { name: "Frontend Dev", icon: Code, color: "text-blue-600" },
      { name: "Backend Dev", icon: Database, color: "text-emerald-600" },
      { name: "Edge Function Expert", icon: Cloud, color: "text-orange-600" },
    ],
  },
  {
    phase: "5. Review",
    title: "PR Reviewer",
    icon: ShieldCheck,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    description: "Revisa código → emite PASS o FAIL. Si FAIL, agentes corrigen y se re-revisa.",
    type: "agent" as const,
  },
  {
    phase: "6. Validation",
    title: "QA Engineer",
    icon: FlaskConical,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    description: "Verifica en local que todo funciona. Emite QA_PASS o QA_FAIL con evidencia.",
    type: "agent" as const,
  },
  {
    phase: "7. Delivery",
    title: "Done",
    icon: User,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    description: "Código aprobado, validado y listo para merge.",
    type: "output" as const,
  },
];

const dispatchRules = [
  {
    type: "Paralelo",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    rules: [
      "Frontend + Backend en features completas (archivos distintos)",
      "UI/UX Designer + Backend cuando no hay dependencia de schema",
      "Análisis o investigación independiente",
    ],
  },
  {
    type: "Secuencial",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    rules: [
      "UI/UX Designer → Frontend Developer (FE necesita specs)",
      "Backend Developer → Edge Function Expert (Edge Fn depende del schema)",
      "Todos → PR Reviewer → QA Engineer (siempre al final)",
    ],
  },
];

export default function PipelinePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
      <p className="mt-1 text-muted-foreground">
        How tasks flow through the agent pipeline
      </p>

      {/* Pipeline Flow */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Execution Flow</h2>
        <div className="flex flex-col items-center gap-2">
          {pipelineSteps.map((step, i) => (
            <div key={step.phase} className="w-full max-w-xl">
              <Card
                className={`transition-all duration-200 hover:shadow-sm ${
                  step.type === "input" || step.type === "output"
                    ? "border-dashed"
                    : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`shrink-0 rounded-lg p-2.5 ${step.bgColor}`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {step.phase}
                      </span>
                    </div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    {step.type === "parallel" && step.subAgents && (
                      <div className="mt-2 flex gap-2">
                        {step.subAgents.map((sub) => (
                          <Badge
                            key={sub.name}
                            variant="outline"
                            className="gap-1 rounded-full text-xs"
                          >
                            <sub.icon className={`h-3 w-3 ${sub.color}`} />
                            {sub.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {step.type === "parallel" && (
                    <Badge className="shrink-0 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      Parallel
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {i < pipelineSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Rules */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Dispatch Rules</h2>
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          {dispatchRules.map((rule) => (
            <Card key={rule.type}>
              <CardHeader className="pb-2">
                <Badge className={`w-fit rounded-full ${rule.badge}`}>
                  {rule.type}
                </Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rule.rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
