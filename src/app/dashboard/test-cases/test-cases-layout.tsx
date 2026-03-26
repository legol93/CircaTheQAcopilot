"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Zap,
  Bug,
  AlertTriangle,
  FolderClosed,
  CalendarDays,
  FlaskConical,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { priorityBadgeClass, statusBadgeClass } from "@/lib/badge-variants";
import { CreateFolderDialog } from "./create-folder-dialog";
import { CreateSprintDialog } from "./create-sprint-dialog";
import { CreateTestCaseDialog } from "./create-test-case-dialog";
import { EditableSuiteName } from "./editable-suite-name";
import { JiraPendingBanner } from "./jira-pending-banner";

interface SuiteItem {
  id: string;
  name: string;
  count: number;
  icon?: string | null;
  color?: string | null;
}

interface TestCase {
  id: string;
  suite_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  ai_generated: boolean;
  created_at: string;
  test_steps: { count: number }[];
}

interface TestCasesLayoutProps {
  projectId: string;
  totalCount: number;
  uncategorizedCount: number;
  folders: SuiteItem[];
  sprints: SuiteItem[];
  testCases: TestCase[];
  activeSuiteId: string | null;
  activeSuiteName: string;
}


const folderIcons: Record<string, React.ElementType> = {
  zap: Zap,
  bug: Bug,
  alert: AlertTriangle,
  flask: FlaskConical,
  folder: FolderClosed,
};

export function TestCasesLayout({
  projectId,
  totalCount,
  uncategorizedCount,
  folders,
  sprints,
  testCases,
  activeSuiteId,
  activeSuiteName,
}: TestCasesLayoutProps) {
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [sprintsOpen, setSprintsOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="flex h-full gap-0 -m-6">
      {/* Left Panel */}
      {panelOpen && (
        <div className="w-72 shrink-0 border-r border-border/60 bg-sidebar overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Test Cases
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setPanelOpen(false)}
              aria-label="Close side panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-2">
            {/* All Test Cases */}
            <Link
              href="/dashboard/test-cases"
              className={cn(
                "relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150",
                !activeSuiteId
                  ? "bg-primary/8 text-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
                  : "text-foreground hover:bg-muted/80"
              )}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className={cn("h-4 w-4", !activeSuiteId && "text-primary")} />
                All Test Cases
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {totalCount}
              </span>
            </Link>

            {/* Uncategorized */}
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <FolderClosed className="h-4 w-4" />
                Uncategorized
              </span>
              <span className="text-xs">{uncategorizedCount}</span>
            </div>

            {/* Folders Section */}
            <div className="mt-4">
              <div className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => setFoldersOpen(!foldersOpen)} className="flex items-center gap-1">
                  <span>Folders</span>
                  {foldersOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                <CreateFolderDialog projectId={projectId} />
              </div>
              {foldersOpen && (
                <div className="mt-1 flex flex-col">
                  {folders.map((folder) => {
                    const IconComponent =
                      folderIcons[folder.icon ?? "folder"] ?? FolderClosed;
                    return (
                      <Link
                        key={folder.id}
                        href={`/dashboard/test-cases?suite=${folder.id}`}
                        className={cn(
                          "relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150",
                          activeSuiteId === folder.id
                            ? "bg-primary/8 text-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
                            : "text-foreground hover:bg-muted/80"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <IconComponent
                            className={cn("h-4 w-4 shrink-0", activeSuiteId === folder.id && "text-primary")}
                            style={{ color: activeSuiteId !== folder.id ? (folder.color ?? undefined) : undefined }}
                          />
                          <EditableSuiteName suiteId={folder.id} name={folder.name} />
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {folder.count}
                        </span>
                      </Link>
                    );
                  })}
                  {folders.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No folders yet
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sprints Section */}
            <div className="mt-4">
              <div className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => setSprintsOpen(!sprintsOpen)} className="flex items-center gap-1">
                  <span>Sprints</span>
                  {sprintsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                <CreateSprintDialog projectId={projectId} />
              </div>
              {sprintsOpen && (
                <div className="mt-1 flex flex-col">
                  {sprints.map((sprint) => (
                    <Link
                      key={sprint.id}
                      href={`/dashboard/test-cases?suite=${sprint.id}`}
                      className={cn(
                        "relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150",
                        activeSuiteId === sprint.id
                          ? "bg-primary/8 text-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
                          : "text-foreground hover:bg-muted/80"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CalendarDays className={cn("h-4 w-4 shrink-0", activeSuiteId === sprint.id && "text-primary")} />
                        <EditableSuiteName suiteId={sprint.id} name={sprint.name} />
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {sprint.count}
                      </span>
                    </Link>
                  ))}
                  {sprints.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No sprints yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - Test Cases Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
          <div className="flex items-center gap-2">
            {!panelOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPanelOpen(true)}
                aria-label="Open side panel"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold tracking-tight">{activeSuiteName}</h2>
            <span className="text-sm text-muted-foreground">
              ({testCases.length})
            </span>
          </div>
          {activeSuiteId && (
            <CreateTestCaseDialog suiteId={activeSuiteId} />
          )}
        </div>

        <JiraPendingBanner
          projectId={projectId}
          suites={[
            ...folders.map((f) => ({ id: f.id, name: f.name })),
            ...sprints.map((s) => ({ id: s.id, name: s.name })),
          ]}
        />

        {testCases.length === 0 ? (
          <div className="mx-6 mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
            <div className="bg-muted p-4 rounded-full">
              <FlaskConical className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No test cases</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              {activeSuiteId
                ? "Add test cases to this folder or sprint to start tracking quality."
                : "Create a folder and start adding test cases to organize your testing."}
            </p>
            {activeSuiteId && (
              <div className="mt-4">
                <CreateTestCaseDialog suiteId={activeSuiteId} />
              </div>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((tc) => (
                <TableRow
                  key={tc.id}
                  className="cursor-pointer transition-colors duration-100 hover:bg-muted/60"
                  onClick={() => (window.location.href = `/dashboard/test-cases/${tc.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tc.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/test-cases/${tc.id}`}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tc.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={priorityBadgeClass[tc.priority]}
                    >
                      {tc.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass[tc.status]}
                    >
                      {tc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tc.test_steps?.[0]?.count ?? 0}
                  </TableCell>
                  <TableCell>
                    {tc.ai_generated ? (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(tc.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
