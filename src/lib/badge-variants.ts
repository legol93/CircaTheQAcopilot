export const priorityBadgeClass: Record<string, string> = {
  low:      "rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  medium:   "rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  high:     "rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  critical: "rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
};

export const statusBadgeClass: Record<string, string> = {
  draft:      "rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  active:     "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  deprecated: "rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
};

export const runStatusBadgeClass: Record<string, string> = {
  pending:     "rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  in_progress: "rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  completed:   "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
};

/* ── GitHub Actions conclusion badges ── */
export const conclusionBadgeClass: Record<string, string> = {
  success:   "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  failure:   "rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  cancelled: "rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  skipped:   "rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  timed_out: "rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
};

/* ── GitHub Actions status badges (running states) ── */
export const ghStatusBadgeClass: Record<string, string> = {
  completed:   "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  in_progress: "rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  queued:      "rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
};

/* ── Tenant badges ── */
export const tenantBadgeClass: Record<string, string> = {
  Hybrid: "rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
  School: "rounded-full bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800",
};

/* ── Trigger / source badges ── */
export const triggerBadgeClass: Record<string, string> = {
  schedule:          "rounded-full bg-slate-50 text-slate-600 border border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600",
  workflow_dispatch: "rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
};

export const sourceBadgeClass =
  "rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800";
