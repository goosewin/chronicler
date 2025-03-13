"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/providers/session-provider";
import { Computer, Home, Layers, LogOut } from "lucide-react";
import Link from "next/link";

export default function Navbar({
  isAdminView = false,
}: {
  isAdminView?: boolean;
}) {
  const { user, logout, isLoading } = useSession();

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl">Chronicler</span>
          {isAdminView && (
            <span className="ml-2 text-xs rounded-full bg-primary/10 text-primary px-2 py-1">
              Admin
            </span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <ThemeSwitcher />

          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {isAdminView ? (
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:flex gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Public Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:flex gap-2"
                  >
                    <Computer className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex gap-2 items-center"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hello, {user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <div className="flex items-center gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/login?signup=true">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
