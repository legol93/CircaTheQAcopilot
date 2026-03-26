"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PenLine,
  FlaskConical,
  PlayCircle,
  CalendarDays,
  LayoutGrid,
  FileText,
  Bot,
  Workflow,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Test Cases", href: "/dashboard/test-cases", icon: PenLine },
  { name: "Test Runs", href: "/dashboard/runs", icon: PlayCircle },
  { name: "Daily Executions", href: "/dashboard/daily-executions", icon: CalendarDays },
  { name: "Control View", href: "/dashboard/control-view", icon: LayoutGrid },
  { name: "Jira Drafts", href: "/dashboard/jira-drafts", icon: FileText },
  { name: "Jira Assistant", href: "/dashboard/jira-assistant", icon: Bot },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Pipeline", href: "/dashboard/pipeline", icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/40 md:block">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-5 w-5" />
          <span>Circa QA</span>
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
