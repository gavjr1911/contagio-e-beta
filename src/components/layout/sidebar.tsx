"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Music,
  ListChecks,
  Settings,
  ClipboardCheck,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionFeature, PermissionLevel } from "@/lib/permissions/types";
import { meetsLevel } from "@/lib/permissions/check";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  permission?: { feature: PermissionFeature; level: PermissionLevel };
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Eventos",
    href: "/eventos",
    icon: Calendar,
    permission: { feature: "events", level: "view" },
  },
  {
    name: "Escalas",
    href: "/escalas",
    icon: ListChecks,
    permission: { feature: "schedules", level: "view" },
  },
  {
    name: "Ministérios",
    href: "/ministerios",
    icon: Users,
    permission: { feature: "ministries", level: "view" },
  },
  {
    name: "Músicas",
    href: "/musicas",
    icon: Music,
    permission: { feature: "songs", level: "view" },
  },
  {
    name: "Checklists",
    href: "/checklists",
    icon: ClipboardCheck,
    permission: { feature: "checklists", level: "view" },
  },
  {
    name: "Usuários",
    href: "/usuarios",
    icon: UserCog,
    adminOnly: true,
  },
  {
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    adminOnly: true,
  },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

/** Conteúdo de navegação compartilhado entre a sidebar desktop e o drawer mobile. */
function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { permissions, isAdmin } = usePermissions();

  const filteredNavigation = navigation.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) {
      return isAdmin || meetsLevel(permissions[item.permission.feature], item.permission.level);
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center"
          aria-label="Ir para o início"
        >
          <Logo variant="orange" size="sm" />
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Navegação principal"
      >
        {filteredNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 min-h-[44px] text-sm font-medium",
                "transition-colors duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & User Section */}
      <div className="border-t border-border p-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <UserNav />
      </div>
    </div>
  );
}

/** Sidebar fixa para desktop (>= md). No mobile, oculta. */
export function Sidebar() {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border shadow-sm",
        "hidden md:flex md:flex-col"
      )}
    >
      <SidebarNav />
    </aside>
  );
}

/** Botão hamburger + drawer overlay para mobile (< md). */
export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "md:hidden inline-flex items-center justify-center rounded-lg",
            "h-11 w-11 -ml-2 text-foreground hover:bg-secondary",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[320px] flex-col bg-card shadow-xl md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "duration-200"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Menu de navegação
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
