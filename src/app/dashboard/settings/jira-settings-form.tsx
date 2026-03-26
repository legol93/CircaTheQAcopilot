"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2 } from "lucide-react";

interface JiraConnection {
  id: string;
  site_url: string;
  project_key: string;
  api_email: string;
  api_token: string;
  webhook_secret: string;
}

interface JiraSettingsFormProps {
  connection: JiraConnection | null;
  projectId: string;
}

export function JiraSettingsForm({
  connection,
  projectId,
}: JiraSettingsFormProps) {
  const [siteUrl, setSiteUrl] = useState(connection?.site_url ?? "");
  const [projectKey, setProjectKey] = useState(connection?.project_key ?? "");
  const [apiEmail, setApiEmail] = useState(connection?.api_email ?? "");
  const [apiToken, setApiToken] = useState(connection?.api_token ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const webhookUrl = connection
    ? `https://uxmnbgvkcehwxlgobfph.supabase.co/functions/v1/jira-webhook?secret=${connection.webhook_secret}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/jira/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          siteUrl,
          projectKey,
          apiEmail,
          apiToken,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save Jira connection");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save Jira connection"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyWebhook() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="jira-site-url">Site URL</Label>
        <Input
          id="jira-site-url"
          placeholder="https://yourcompany.atlassian.net"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jira-project-key">Project Key</Label>
        <Input
          id="jira-project-key"
          placeholder="PROJ"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jira-api-email">API Email</Label>
        <Input
          id="jira-api-email"
          type="email"
          placeholder="your-email@company.com"
          value={apiEmail}
          onChange={(e) => setApiEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jira-api-token">API Token</Label>
        <Input
          id="jira-api-token"
          type="password"
          placeholder="Your Jira API token"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          required
        />
      </div>

      {webhookUrl && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="jira-webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="jira-webhook-url"
              value={webhookUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyWebhook}
              aria-label="Copy webhook URL"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this URL as a webhook in your Jira project settings.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-600">
          Jira connection saved successfully.
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save"
        )}
      </Button>
    </form>
  );
}
