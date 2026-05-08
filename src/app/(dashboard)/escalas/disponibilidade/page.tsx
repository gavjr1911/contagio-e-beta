"use client";

import { useState } from "react";
import { Calendar, Clock, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BlockedDates } from "@/components/schedules/blocked-dates";
import {
  useBlockedDates,
  useAddBlockedDate,
  useRemoveBlockedDate,
} from "@/hooks/use-schedules";

export default function DisponibilidadePage() {
  const [removingId, setRemovingId] = useState<string | undefined>();

  const { data: blockedDates, isLoading } = useBlockedDates();
  const addMutation = useAddBlockedDate();
  const removeMutation = useRemoveBlockedDate();

  const handleAdd = (data: {
    startDate: Date;
    endDate: Date;
    reason?: string;
  }) => {
    addMutation.mutate(data);
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    removeMutation.mutate(id, {
      onSettled: () => setRemovingId(undefined),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/escalas"
        backLabel="Voltar para escalas"
        title="Minha Disponibilidade"
        description="Gerencie suas datas de indisponibilidade"
      />

      {/* Info card */}
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground text-sm font-medium">
              Como funciona?
            </p>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
              Marque as datas em que você não estará disponível para servir.
              Os líderes de ministério verão essas informações ao criar
              escalas, evitando escalar você nesses dias.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-[400px] rounded-lg bg-muted animate-pulse" />
            <div className="h-[200px] rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <BlockedDates
            blockedDates={blockedDates || []}
            onAdd={handleAdd}
            onRemove={handleRemove}
            isAdding={addMutation.isPending}
            isRemoving={removingId}
          />
        )}
      </div>

      {/* Tips section */}
      <Card className="bg-secondary border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Dicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">1</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Marque férias, viagens e compromissos com antecedência
            </p>
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">2</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Você ainda pode ser escalado em datas bloqueadas, mas o líder
              saberá da sua indisponibilidade
            </p>
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">3</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Atualize regularmente para manter os líderes informados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
