"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ministerios</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie os ministerios e seus membros
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* New Ministry Button (Admin only) */}
          {isAdmin && (
            <Button asChild>
              <Link href="/ministerios/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ministerio
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Church className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Erro ao carregar ministerios
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ocorreu um erro ao carregar a lista de ministerios. Tente novamente.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MinistryCardSkeleton key={i} />
          ))}
        </div>
      ) : ministries && ministries.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            Nenhum ministerio encontrado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ainda nao ha ministerios cadastrados.
          </p>
          {isAdmin && (
            <Button asChild className="mt-4">
              <Link href="/ministerios/novo">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro ministerio
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
