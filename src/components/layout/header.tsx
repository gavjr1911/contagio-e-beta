"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/eventos": "Eventos",
  "/escalas": "Escalas",
  "/ministerios": "Ministerios",
  "/musicas": "Musicas",
  "/relatorios": "Relatorios",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configuracoes",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ name: "Inicio", href: "/" }];

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
        "sticky top-0 z-30 flex flex-col gap-1 bg-beta-black/80 backdrop-blur-sm border-b border-beta-gray-blue/10 px-6 py-4",
        className
      )}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-beta-gray-blue/50" />
            )}
            {index === 0 ? (
              <Link
                href={crumb.href}
                className="flex items-center gap-1 text-beta-gray-blue hover:text-beta-cream transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">{crumb.name}</span>
              </Link>
            ) : index === breadcrumbs.length - 1 ? (
              <span className="text-beta-cream font-medium">{crumb.name}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-beta-gray-blue hover:text-beta-cream transition-colors"
              >
                {crumb.name}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Page Title */}
      <h1 className="text-2xl font-semibold text-beta-cream">{pageTitle}</h1>
    </header>
  );
}
