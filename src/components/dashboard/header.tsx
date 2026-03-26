"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  email: string;
}

export function Header({ email }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <div className="flex items-center gap-2 p-2">
            <p className="text-sm font-medium">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <User className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
