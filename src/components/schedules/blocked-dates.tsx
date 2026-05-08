"use client";

import { useState } from "react";
import { format, isSameDay, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Trash2, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BlockedDate } from "@/hooks/use-schedules";

interface BlockedDatesProps {
  blockedDates: BlockedDate[];
  onAdd: (data: { startDate: Date; endDate: Date; reason?: string }) => void;
  onRemove: (id: string) => void;
  isAdding?: boolean;
  isRemoving?: string;
}

export function BlockedDates({
  blockedDates,
  onAdd,
  onRemove,
  isAdding = false,
  isRemoving,
}: BlockedDatesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");

  const handleAdd = () => {
    if (!selectedRange?.from) return;

    onAdd({
      startDate: selectedRange.from,
      endDate: selectedRange.to || selectedRange.from,
      reason: reason || undefined,
    });

    // Reset form
    setSelectedRange(undefined);
    setReason("");
    setIsDialogOpen(false);
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some((blocked) =>
      isWithinInterval(date, {
        start: new Date(blocked.startDate),
        end: new Date(blocked.endDate),
      })
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar showing blocked dates */}
      <Card className="bg-secondary border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Calendário de Disponibilidade
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-[380px]">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Nova indisponibilidade
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Selecione as datas em que você não estará disponível.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={setSelectedRange}
                    disabled={{ before: new Date() }}
                    className="rounded-lg border border-border bg-muted"
                  />

                  {selectedRange?.from && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <p className="text-foreground text-sm font-medium">
                        Período selecionado:
                      </p>
                      <p className="text-primary text-sm">
                        {format(selectedRange.from, "dd 'de' MMMM", {
                          locale: ptBR,
                        })}
                        {selectedRange.to && !isSameDay(selectedRange.from, selectedRange.to) && (
                          <>
                            {" "}
                            até{" "}
                            {format(selectedRange.to, "dd 'de' MMMM", {
                              locale: ptBR,
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="block-reason"
                      className="text-foreground text-sm font-medium"
                    >
                      Motivo (opcional)
                    </Label>
                    <Textarea
                      id="block-reason"
                      placeholder="Ex: Viagem, compromisso familiar..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!selectedRange?.from || isAdding}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isAdding ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Salvando...
                      </span>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="multiple"
            selected={blockedDates.flatMap((blocked) => {
              const dates: Date[] = [];
              let current = new Date(blocked.startDate);
              const end = new Date(blocked.endDate);
              while (current <= end) {
                dates.push(new Date(current));
                current = addDays(current, 1);
              }
              return dates;
            })}
            disabled={{ before: new Date() }}
            className="rounded-lg"
            classNames={{
              day_button: "aria-selected:bg-red-500/30 aria-selected:text-red-300",
              selected: "bg-red-500/30 text-red-300",
            }}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/30" />
              <span>Indisponível</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span>Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List of blocked dates */}
      <Card className="bg-secondary border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">
            Datas bloqueadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blockedDates.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma data bloqueada
              </p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Adicione datas em que você não estará disponível
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((blocked) => {
                const startDate = new Date(blocked.startDate);
                const endDate = new Date(blocked.endDate);
                const isSingleDay = isSameDay(startDate, endDate);

                return (
                  <div
                    key={blocked.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium">
                        {isSingleDay
                          ? format(startDate, "dd 'de' MMMM", { locale: ptBR })
                          : `${format(startDate, "dd/MM", {
                              locale: ptBR,
                            })} - ${format(endDate, "dd/MM/yyyy", {
                              locale: ptBR,
                            })}`}
                      </p>
                      {blocked.reason && (
                        <p className="text-muted-foreground text-xs mt-0.5 truncate">
                          {blocked.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                      onClick={() => onRemove(blocked.id)}
                      disabled={isRemoving === blocked.id}
                    >
                      {isRemoving === blocked.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
