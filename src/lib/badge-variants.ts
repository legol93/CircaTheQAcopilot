export const priorityBadgeClass: Record<string, string> = {
  low:      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium:   "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  high:     "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export const statusBadgeClass: Record<string, string> = {
  draft:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  active:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  deprecated: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
};

export const runStatusBadgeClass: Record<string, string> = {
  pending:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  completed:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
};
