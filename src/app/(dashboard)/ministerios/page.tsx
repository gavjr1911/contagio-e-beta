"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MinistryCard,
  MinistryCardSkeleton,
} from "@/components/ministries/ministry-card";
import {
  useMinistries,
  getMinistryTypeLabel,
  ministryTypeLabels,
} from "@/hooks/use-ministries";
import { MinistryType } from "@/generated/prisma/enums";

export default function MinisteriosPage() {
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<MinistryType | "all">("all");

  const { data: ministries, isLoading, error } = useMinistries(
    selectedType === "all" ? undefined : selectedType
  );

  const isAdmin = session?.user?.role === "ADMIN";

  const ministryTypes = Object.keys(ministryTypeLabels) as MinistryType[];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-beta-black">Ministerios</h1>
          <p className="mt-1 text-beta-navy/70">
            Gerencie os ministerios e seus membros
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Filter */}
          <Select
            value={selectedType}
            onValueChange={(value) =>
              setSelectedType(value as MinistryType | "all")
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {ministryTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getMinistryTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Ministry Button (Admin only) */}
          {isAdmin && (
            <Button asChild className="bg-beta-terracotta hover:bg-beta-terracotta/90">
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Church className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-beta-black">
            Erro ao carregar ministerios
          </h3>
          <p className="mt-1 text-sm text-beta-navy/60">
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
          {ministries.map((ministry) => (
            <MinistryCard key={ministry.id} ministry={ministry} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-beta-navy/10">
            <Church className="h-8 w-8 text-beta-navy/50" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-beta-black">
            Nenhum ministerio encontrado
          </h3>
          <p className="mt-1 text-sm text-beta-navy/60">
            {selectedType !== "all"
              ? `Nao ha ministerios do tipo "${getMinistryTypeLabel(selectedType)}".`
              : "Ainda nao ha ministerios cadastrados."}
          </p>
          {isAdmin && selectedType === "all" && (
            <Button asChild className="mt-4 bg-beta-terracotta hover:bg-beta-terracotta/90">
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
