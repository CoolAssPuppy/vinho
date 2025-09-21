"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wine,
  Map,
  BookOpen,
  Sparkles,
  Menu,
  Camera,
  User,
} from "lucide-react";
import { useUser } from "@/components/providers/user-provider";

const routes = [
  {
    href: "/journal",
    label: "Journal",
    icon: BookOpen,
  },
  {
    href: "/scan",
    label: "Scan",
    icon: Camera,
  },
  {
    href: "/map",
    label: "Map",
    icon: Map,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, profile } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl">
        <nav className="flex h-14 items-center px-4 md:px-6">
          <div className="mr-4 hidden md:flex">
            <Link href="/journal" className="mr-6 flex items-center space-x-2">
              <Wine className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">Vinho</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname === route.href
                      ? "text-foreground"
                      : "text-foreground/60",
                  )}
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {routes.map((route) => {
                const Icon = route.icon;
                return (
                  <DropdownMenuItem key={route.href} asChild>
                    <Link href={route.href} className="flex items-center">
                      <Icon className="mr-2 h-4 w-4" />
                      {route.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none"></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="Avatar" />
                    ) : null}
                    <AvatarFallback>
                      {user?.email?.[0]?.toUpperCase() || (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
