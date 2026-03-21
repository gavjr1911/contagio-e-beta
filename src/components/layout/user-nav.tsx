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
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-beta-black/20",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.image || undefined} alt={user?.name || "Usuario"} />
            <AvatarFallback className="bg-beta-terracotta text-beta-cream text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 text-left">
              <p className="font-medium text-beta-cream truncate">
                {user?.name || "Usuario"}
              </p>
              <p className="text-xs text-beta-gray-blue truncate">
                {user?.email || ""}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-beta-navy border-beta-gray-blue/20"
        align={isCollapsed ? "center" : "end"}
        side="top"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-beta-cream">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
            <p className="text-xs text-beta-gray-blue truncate">
              {user?.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-beta-gray-blue/20" />
        <DropdownMenuItem asChild>
          <Link
            href="/perfil"
            className="flex items-center gap-2 text-beta-cream cursor-pointer hover:bg-beta-black/20 focus:bg-beta-black/20"
          >
            <User className="h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/configuracoes"
            className="flex items-center gap-2 text-beta-cream cursor-pointer hover:bg-beta-black/20 focus:bg-beta-black/20"
          >
            <Settings className="h-4 w-4" />
            Configuracoes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-beta-gray-blue/20" />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-red-400 cursor-pointer hover:bg-beta-black/20 focus:bg-beta-black/20 focus:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
