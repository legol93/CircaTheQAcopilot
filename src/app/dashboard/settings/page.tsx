import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your account settings
      </p>

      <div className="mt-6 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">User ID</p>
            <p className="font-mono text-sm">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Provider</p>
            <p className="font-medium">{user?.app_metadata?.provider}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
