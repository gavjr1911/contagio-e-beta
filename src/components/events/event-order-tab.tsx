"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderItemCard } from "@/components/events/order-item-card";
import {
  calculateStartTimes,
  calculateTotalDuration,
  formatDuration,
  type EventItem as EventItemType,
} from "@/hooks/use-event-items";

interface EventOrderTabProps {
  event: {
    id: string;
    status: string;
    items?: unknown[];
  };
  eventId: string;
  canEditOrder: boolean;
  startTimeFormatted: string;
}

export function EventOrderTab({
  event,
  eventId,
  canEditOrder,
  startTimeFormatted,
}: EventOrderTabProps) {
  const isCompleted = event.status === "COMPLETED";
  const items = (event.items as EventItemType[] | undefined) ?? [];

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhuma ordem do culto definida
              </p>
              <p className="mb-4">
                {isCompleted
                  ? "Este evento foi concluido sem ordem do culto."
                  : "Crie a ordem do culto para organizar as atividades do evento."}
              </p>
              {canEditOrder && (
                <Link href={`/eventos/${eventId}/ordem`}>
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Ordem do Culto
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMinutes = calculateTotalDuration(items);
  const [h, m] = startTimeFormatted.split(":").map(Number);
  const endMinutes = h * 60 + m + totalMinutes;
  const endH = Math.floor(endMinutes / 60) % 24;
  const endM = endMinutes % 60;
  const endTimeFormatted = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  const startTimes = calculateStartTimes(items, startTimeFormatted);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Atividades</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duração Total</p>
              <p className="text-2xl font-bold text-emerald-500">
                {formatDuration(totalMinutes)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Início</p>
              <p className="text-2xl font-bold text-blue-500">{startTimeFormatted}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Término Previsto</p>
              <p className="text-2xl font-bold text-amber-500">{endTimeFormatted}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Atividades</h2>
        {canEditOrder && (
          <Link href={`/eventos/${eventId}/ordem`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Editar Ordem
            </Button>
          </Link>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <OrderItemCard
            key={item.id}
            item={item}
            startTime={startTimes.get(item.id) || startTimeFormatted}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
