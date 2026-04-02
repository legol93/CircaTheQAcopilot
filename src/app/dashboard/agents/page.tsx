"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  DollarSign,
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
  RefreshCw,
  Loader2,
  Bot,
} from "lucide-react";

/* ─── Icon mapping ───────────────────────────────────────── */

const iconMap: Record<string, React.ElementType> = {
  orchestrator: Brain,
  "uiux-designer": Palette,
  "frontend-developer": Code,
  "backend-developer": Database,
  "edge-function-expert": Cloud,
  "pr-reviewer": ShieldCheck,
  "qa-engineer": FlaskConical,
  tokenmoney: DollarSign,
};

const colorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  orchestrator: { color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-950/50", borderColor: "border-l-purple-500" },
  "uiux-designer": { color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-950/50", borderColor: "border-l-pink-500" },
  "frontend-developer": { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/50", borderColor: "border-l-blue-500" },
  "backend-developer": { color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/50", borderColor: "border-l-emerald-500" },
  "edge-function-expert": { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/50", borderColor: "border-l-orange-500" },
  "pr-reviewer": { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/50", borderColor: "border-l-amber-500" },
  "qa-engineer": { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/50", borderColor: "border-l-red-500" },
  tokenmoney: { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/50", borderColor: "border-l-green-500" },
};

const defaultColors = { color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-l-slate-500" };

/* ─── Types ──────────────────────────────────────────────── */

interface AgentData {
  name: string;
  description: string;
  model: string;
  tools: string;
  systemPrompt: string;
}

/* ─── Pipeline data ──────────────────────────────────────── */

const pipelineSteps = [
  { phase: "1. Entry", title: "User Request", icon: User, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", description: "Feature, bug fix, o cambio de producto", type: "input" as const },
  { phase: "2. Orchestration", title: "Orchestrator", icon: Brain, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-950/50", description: "Analiza, clasifica y decide qué agentes invocar", type: "agent" as const },
  { phase: "3. Design", title: "UI/UX Designer", icon: Palette, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-950/50", description: "Produce specs de UI si hay pantallas nuevas", type: "agent" as const },
  { phase: "3b. Cost Audit", title: "Token Money", icon: TrendingUp, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/50", description: "Audita costos de API y optimiza prompts", type: "agent" as const },
  { phase: "4. Implementation", title: "Dev Agents", icon: GitBranch, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/50", description: "Frontend + Backend + Edge Functions (paralelo)", type: "parallel" as const, subAgents: [{ name: "Frontend", icon: Code, color: "text-blue-600" }, { name: "Backend", icon: Database, color: "text-emerald-600" }, { name: "Edge Fn", icon: Cloud, color: "text-orange-600" }] },
  { phase: "5. Review", title: "PR Reviewer", icon: ShieldCheck, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/50", description: "Revisa código → PASS o FAIL", type: "agent" as const },
  { phase: "6. Validation", title: "QA Engineer", icon: FlaskConical, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/50", description: "Verifica en local → QA_PASS o QA_FAIL", type: "agent" as const },
  { phase: "7. Delivery", title: "Done", icon: User, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/50", description: "Código aprobado, validado y listo", type: "output" as const },
];

const dispatchRules = [
  { type: "Paralelo", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", rules: ["Frontend + Backend en features completas", "UI/UX Designer + Backend sin dependencia de schema", "Análisis o investigación independiente"] },
  { type: "Secuencial", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", rules: ["UI/UX Designer → Frontend Developer", "Backend Developer → Edge Function Expert", "Todos → PR Reviewer → QA Engineer (siempre al final)"] },
];

/* ─── Component ──────────────────────────────────────────── */

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchAgents() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
        setLastUpdated(new Date());
      }
    } catch {
      // Keep existing data
    } finally {
      setRefreshing(false);
    }
  }

  const slugify = (name: string) => name.toLowerCase().replace(/[\s/]+/g, "-");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents & Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            AI agents and execution flow that power the development pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAgents()}
            disabled={refreshing}
            className="gap-1.5"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {refreshing ? "Syncing..." : "Sync from repo"}
          </Button>
        </div>
      </div>

      {/* Agents Grid */}
      <h2 className="mt-8 text-lg font-semibold">
        Agents
        <Badge variant="secondary" className="ml-2 rounded-full text-xs">
          {agents.length}
        </Badge>
      </h2>

      {refreshing ? (
        <div className="mt-4 flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Syncing agents from repository...
        </div>
      ) : agents.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Bot className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {lastUpdated ? "No agents found in .claude/agents/" : "Click \"Sync from repo\" to load agents"}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const slug = slugify(agent.name);
            const colors = colorMap[slug] ?? defaultColors;
            const IconComp = iconMap[slug] ?? Bot;

            return (
              <Card
                key={agent.name}
                className={`border-l-4 ${colors.borderColor} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
              >
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  <div className={`rounded-lg p-2 ${colors.bgColor}`}>
                    <IconComp className={`h-5 w-5 ${colors.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full font-mono text-xs">
                        {agent.model}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {agent.description}
                  </p>
                  {agent.tools && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Tools:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.tools.split(",").map((tool) => (
                          <span
                            key={tool.trim()}
                            className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {tool.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Separator className="my-8" />

      {/* Pipeline Flow */}
      <h2 className="text-lg font-semibold">Execution Flow</h2>
      <div className="mt-4 flex flex-col items-center gap-2">
        {pipelineSteps.map((step, i) => (
          <div key={step.phase} className="w-full max-w-xl">
            <Card className={`transition-all duration-200 hover:shadow-sm ${step.type === "input" || step.type === "output" ? "border-dashed" : ""}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`shrink-0 rounded-lg p-2.5 ${step.bgColor}`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground">{step.phase}</span>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.type === "parallel" && step.subAgents && (
                    <div className="mt-2 flex gap-2">
                      {step.subAgents.map((sub) => (
                        <Badge key={sub.name} variant="outline" className="gap-1 rounded-full text-xs">
                          <sub.icon className={`h-3 w-3 ${sub.color}`} />
                          {sub.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {step.type === "parallel" && (
                  <Badge className="shrink-0 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Parallel</Badge>
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

      {/* Dispatch Rules */}
      <h2 className="mt-8 text-lg font-semibold">Dispatch Rules</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 max-w-xl">
        {dispatchRules.map((rule) => (
          <Card key={rule.type}>
            <CardHeader className="pb-2">
              <Badge className={`w-fit rounded-full ${rule.badge}`}>{rule.type}</Badge>
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
  );
}
