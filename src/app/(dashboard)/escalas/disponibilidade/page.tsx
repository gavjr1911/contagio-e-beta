"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/escalas">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground font-display">
                Minha Disponibilidade
              </h1>
              <p className="text-muted-foreground text-sm">
                Gerencie suas datas de indisponibilidade
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="px-4 pt-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground text-sm font-medium">
                Como funciona?
              </p>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                Marque as datas em que voce nao estara disponivel para servir.
                Os lideres de ministerio verao essas informacoes ao criar
                escalas, evitando escalar voce nesses dias.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="px-4 pt-4">
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
      <div className="px-4 pt-6">
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
                Marque ferias, viagens e compromissos com antecedencia
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-xs font-bold">2</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Voce ainda pode ser escalado em datas bloqueadas, mas o lider
                sabera da sua indisponibilidade
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-xs font-bold">3</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Atualize regularmente para manter os lideres informados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
