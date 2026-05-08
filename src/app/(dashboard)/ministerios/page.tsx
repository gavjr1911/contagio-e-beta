"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  MinistryCard,
  MinistryCardSkeleton,
} from "@/components/ministries/ministry-card";
import { useMinistries } from "@/hooks/use-ministries";

export default function MinisteriosPage() {
  const { data: session } = useSession();

  const { data: ministries, isLoading, error } = useMinistries();

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ministérios"
        description="Gerencie os ministérios e seus membros"
        actions={
          isAdmin && (
            <Button asChild>
              <Link href="/ministerios/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ministério
              </Link>
            </Button>
          )
        }
      />

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Church className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Erro ao carregar ministérios
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ocorreu um erro ao carregar a lista de ministérios. Tente novamente.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MinistryCardSkeleton key={i} />
          ))}
        </div>
      ) : ministries && ministries.length > 0 ? (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ministries.map((ministry, index) => (
            <div
              key={ministry.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <MinistryCard ministry={ministry} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Church className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Nenhum ministério encontrado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ainda não há ministérios cadastrados.
          </p>
          {isAdmin && (
            <Button asChild className="mt-4">
              <Link href="/ministerios/novo">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro ministério
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
