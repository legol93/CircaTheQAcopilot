@AGENTS.md

## Project: Circa QA Copilot

Test Case Manager built with Next.js (App Router) + Supabase + Tailwind + shadcn/ui.

### Key paths
- `src/app/` — Next.js App Router pages
- `src/components/ui/` — shadcn/ui components (base-ui, NOT radix — use `render` prop instead of `asChild`)
- `src/lib/supabase/` — Supabase client (browser, server, middleware)
- `src/types/` — TypeScript types
- `supabase/migrations/` — PostgreSQL migrations

### Important conventions
- shadcn/ui v4 uses `@base-ui/react` — `DialogTrigger`, `DropdownMenuTrigger` use `render` prop, NOT `asChild`
- `Select.onValueChange` returns `string | null` — always guard with `(v) => v && setValue(v)`
- Supabase RLS is enabled on ALL tables — never skip it

---

## Sub-agent pipeline

### Punto de entrada
Siempre invocar `orchestrator` primero para cualquier tarea nueva.

### Routing de dispatch
**Paralelo** (sin dependencias entre sí):
- frontend-developer + backend-developer en features completas
- uiux-designer + backend-developer cuando no hay dependencia de schema en la UI

**Secuencial** (esperar output antes de continuar):
- uiux-designer → frontend-developer
- backend-developer → edge-function-expert
- [todos] → pr-reviewer → qa-engineer (siempre al final)

### Memoria compartida
- Decisiones de arquitectura: `.claude/memory/decisions.md`
- Plan activo: `.claude/memory/active-plan.md`
- Scratchpad temporal: `.claude/memory/scratchpad.md`

### Definition of Done global
Ninguna tarea está completa hasta que pr-reviewer emite ✅ PASS y qa-engineer emite ✅ QA_PASS.

### Pipeline completo
```
orchestrator → [agentes dev] → pr-reviewer (PASS) → qa-engineer (QA_PASS) → usuario
```
