"use client";

import { useState } from "react";
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
  Bug,
  Bot,
  Workflow,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Test Cases", href: "/dashboard/test-cases", icon: PenLine },
  { name: "Test Runs", href: "/dashboard/runs", icon: PlayCircle },
  { name: "Daily Executions", href: "/dashboard/daily-executions", icon: CalendarDays },
  { name: "Bug Tickets", href: "/dashboard/bug-tickets", icon: Bug },
  { name: "Jira Drafts", href: "/dashboard/jira-drafts", icon: FileText },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Pipeline", href: "/dashboard/pipeline", icon: Workflow },
];

export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex flex-1 flex-col gap-0.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              {item.name}
            </Link>
          );
        })}
      </div>
      <Separator className="my-2" />
      <Link
        href="/dashboard/settings"
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          pathname === "/dashboard/settings"
            ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        <Settings className={cn("h-4 w-4 shrink-0", pathname === "/dashboard/settings" && "text-primary")} />
        Settings
      </Link>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar md:block">
      <div className="flex h-14 items-center border-b border-border/60 px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="h-4 w-4" />
          </div>
          <span className="text-foreground">Circa QA</span>
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex h-[calc(100vh-3.5rem)] flex-col justify-between p-3">
        <NavItems />
      </nav>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b border-border/60 px-6">
          <SheetTitle>
            <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FlaskConical className="h-4 w-4" />
              </div>
              <span>Circa QA</span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex flex-1 flex-col justify-between p-3">
          <NavItems onNavigate={() => onOpenChange(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
