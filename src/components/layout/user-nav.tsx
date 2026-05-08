"use client";

import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserNavProps {
  isCollapsed?: boolean;
}

export function UserNav({ isCollapsed = false }: UserNavProps) {
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-muted",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.image || undefined} alt={user?.name || "Usuário"} />
            <AvatarFallback className="bg-primary text-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ""}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-card border-border"
        align={isCollapsed ? "center" : "end"}
        side="top"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-foreground">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name || "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted" />
        <DropdownMenuItem asChild>
          <Link
            href="/perfil"
            className="flex items-center gap-2 text-foreground cursor-pointer hover:bg-muted focus:bg-muted"
          >
            <User className="h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/configuracoes"
            className="flex items-center gap-2 text-foreground cursor-pointer hover:bg-muted focus:bg-muted"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-muted" />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-red-400 cursor-pointer hover:bg-muted focus:bg-muted focus:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
