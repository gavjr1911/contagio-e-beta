"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Music,
  BarChart3,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";
import { useState } from "react";

const navigation = [
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
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-beta-navy transition-all duration-300 flex flex-col",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-beta-gray-blue/20">
        <Link href="/" className="flex items-center">
          <span
            className={cn(
              "font-display text-2xl font-light tracking-tight text-beta-cream transition-opacity",
              isCollapsed && "opacity-0 w-0 overflow-hidden"
            )}
          >
            Be
            <span className="relative">
              t
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-beta-cream" />
            </span>
            a
          </span>
          {isCollapsed && (
            <span className="font-display text-2xl font-light text-beta-cream">
              B
            </span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-beta-gray-blue hover:text-beta-cream hover:bg-beta-black/20 transition-colors"
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
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-beta-terracotta text-beta-cream"
                  : "text-beta-gray-blue hover:text-beta-cream hover:bg-beta-black/20"
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

      {/* User Section */}
      <div className="border-t border-beta-gray-blue/20 p-3">
        <UserNav isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
