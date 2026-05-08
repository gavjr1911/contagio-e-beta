"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileSidebar } from "./sidebar";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/eventos": "Eventos",
  "/escalas": "Escalas",
  "/ministerios": "Ministérios",
  "/musicas": "Músicas",
  "/relatorios": "Relatórios",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/checklists": "Checklists",
  "/usuarios": "Usuários",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ name: "Início", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const name = pageTitles[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ name, href: currentPath });
  }

  return breadcrumbs;
}

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check for parent paths
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const path = "/" + segments.join("/");
    if (pageTitles[path]) {
      return pageTitles[path];
    }
    segments.pop();
  }

  return "Dashboard";
}

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = getPageTitle(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border",
        "px-4 md:px-6 py-3 md:py-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <MobileSidebar />

        <div className="flex-1 min-w-0">
          {/* Breadcrumbs (apenas em desktop) */}
          <nav className="hidden md:flex items-center text-sm" aria-label="Trilha de navegação">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
                )}
                {index === 0 ? (
                  <Link
                    href={crumb.href}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span className="sr-only">{crumb.name}</span>
                  </Link>
                ) : index === breadcrumbs.length - 1 ? (
                  <span className="text-foreground font-medium truncate">{crumb.name}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Page Title */}
          <h1 className="text-lg md:text-2xl font-semibold text-foreground truncate md:mt-0.5">
            {pageTitle}
          </h1>
        </div>
      </div>
    </header>
  );
}
