import { Bot } from "lucide-react";

export default function JiraAssistantPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Jira Assistant</h1>
      <p className="mt-1 text-muted-foreground">
        AI-powered test case generation from Jira tickets
      </p>

      <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
        <div className="rounded-full bg-muted p-4">
          <Bot className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Coming soon</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
          The Jira Assistant will automatically analyze your Jira tickets and
          generate comprehensive test cases using AI.
        </p>
      </div>
    </div>
  );
}
