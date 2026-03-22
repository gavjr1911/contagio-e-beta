"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Music,
  BarChart3,
  ListChecks,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LogoText } from "@/components/ui/logo";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
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
  },
  {
    name: "Escalas",
    href: "/escalas",
    icon: ListChecks,
  },
  {
    name: "Ministerios",
    href: "/ministerios",
    icon: Users,
  },
  {
    name: "Musicas",
    href: "/musicas",
    icon: Music,
  },
  {
    name: "Relatorios",
    href: "/relatorios",
    icon: BarChart3,
  },
  {
    name: "Configuracoes",
    href: "/configuracoes",
    icon: Settings,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  // Filtrar itens de navegacao baseado na role do usuario
  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col shadow-lg",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <Link href="/" className="flex items-center">
          <div
            className={cn(
              "transition-opacity",
              isCollapsed && "opacity-0 w-0 overflow-hidden"
            )}
          >
            <Logo variant="orange" size="sm" />
          </div>
          {isCollapsed && (
            <Logo variant="orange" size="sm" className="w-6" />
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-opacity",
                  isCollapsed && "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & User Section */}
      <div className="border-t border-border p-3 space-y-3">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          <ThemeToggle />
        </div>
        <UserNav isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
