import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  DollarSign,
  Palette,
  Code,
  Database,
  Cloud,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";

const agents = [
  {
    name: "Orchestrator",
    slug: "orchestrator",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-l-purple-500",
    model: "claude-opus-4-5",
    role: "Director",
    description:
      "Punto de entrada para cualquier tarea. Analiza el prompt, identifica qué agentes son necesarios, decide si ejecutarlos en paralelo o secuencia, y coordina el flujo completo.",
    triggers: ["Cualquier feature nueva", "Bug fix", "Cambio de producto"],
  },
  {
    name: "UI/UX Designer",
    slug: "uiux-designer",
    icon: Palette,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-l-pink-500",
    model: "claude-sonnet-4-5",
    role: "Design",
    description:
      "Produce specs de UI/UX antes de implementar. Define estados, layout, componentes, interacciones y criterios de aceptación visual.",
    triggers: ["Nueva pantalla", "Componente complejo", "Ambigüedad visual"],
  },
  {
    name: "Frontend Developer",
    slug: "frontend-developer",
    icon: Code,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-l-blue-500",
    model: "claude-sonnet-4-5",
    role: "Frontend",
    description:
      "Implementa componentes React, páginas, hooks y lógica de UI. Stack: Next.js + TypeScript + Tailwind + shadcn/ui.",
    triggers: ["Nuevas pantallas", "Refactors de componentes", "Integración con Supabase"],
  },
  {
    name: "Backend Developer",
    slug: "backend-developer",
    icon: Database,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    borderColor: "border-l-emerald-500",
    model: "claude-sonnet-4-5",
    role: "Backend",
    description:
      "Diseña e implementa la capa de datos: esquemas PostgreSQL, políticas RLS, funciones SQL, migraciones y configuración de Auth/Storage.",
    triggers: ["Nuevas tablas", "Cambios de schema", "RLS policies", "Lógica de negocio"],
  },
  {
    name: "Edge Function Expert",
    slug: "edge-function-expert",
    icon: Cloud,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-l-orange-500",
    model: "claude-sonnet-4-5",
    role: "Serverless",
    description:
      "Implementa Supabase Edge Functions en Deno/TypeScript. Maneja service role key, APIs externas, JWT, webhooks y procesamiento serverless.",
    triggers: ["Webhooks", "APIs externas", "JWT custom claims", "Service role operations"],
  },
  {
    name: "PR Reviewer",
    slug: "pr-reviewer",
    icon: ShieldCheck,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-l-amber-500",
    model: "claude-sonnet-4-5",
    role: "Review",
    description:
      "Revisa todo el código producido antes de considerarlo listo. Emite veredicto PASS o FAIL con issues específicos por agente.",
    triggers: ["Siempre al final del pipeline", "Después de todos los agentes dev"],
  },
  {
    name: "QA Engineer",
    slug: "qa-engineer",
    icon: FlaskConical,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    borderColor: "border-l-red-500",
    model: "claude-sonnet-4-5",
    role: "QA",
    description:
      "Valida en local que los cambios realmente funcionan. Ejecuta pruebas funcionales, verifica flujos end-to-end. Emite QA_PASS o QA_FAIL con evidencia.",
    triggers: ["Después de PR Reviewer PASS", "Verificación end-to-end"],
  },
  {
    name: "Token Money",
    slug: "tokenmoney",
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    borderColor: "border-l-green-500",
    model: "claude-haiku-4-5",
    role: "Cost Optimization",
    description:
      "Guardián del presupuesto de tokens. Audita consumo de API, optimiza prompts, selecciona modelos correctos por tarea, y reduce costos sin sacrificar calidad.",
    triggers: ["Nueva llamada a Claude API", "Diseño de prompts", "Costo creciente", "Nuevos agentes"],
  },
];

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
      <p className="mt-1 text-muted-foreground">
        AI agents that power the development pipeline
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card
            key={agent.slug}
            className={`border-l-4 ${agent.borderColor} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
          >
            <CardHeader className="flex flex-row items-start gap-3 pb-2">
              <div className={`rounded-lg p-2 ${agent.bgColor}`}>
                <agent.icon className={`h-5 w-5 ${agent.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{agent.name}</CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-xs">
                    {agent.role}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full font-mono text-xs">
                    {agent.model}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Triggers:</p>
                <div className="flex flex-wrap gap-1">
                  {agent.triggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
