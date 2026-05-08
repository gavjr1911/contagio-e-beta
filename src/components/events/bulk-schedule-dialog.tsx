"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Users,
  X,
  Clock,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useBulkSchedule,
  type BulkScheduleItem,
  type BulkScheduleResult,
} from "@/hooks/use-schedules";
import { useToast } from "@/hooks/use-toast";
import type { MinistryPosition } from "@/hooks/use-ministries";

export interface SelectedMember {
  userId: string;
  userName: string | null;
  userImage: string | null;
  userEmail: string;
  ministryId: string;
  ministryName: string;
}

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  selectedMembers: SelectedMember[];
  positions: MinistryPosition[];
  onComplete: () => void;
  existingUserIds?: string[];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BulkScheduleDialog({
  open,
  onOpenChange,
  eventId,
  selectedMembers,
  positions,
  onComplete,
  existingUserIds = [],
}: BulkScheduleDialogProps) {
  const { toast } = useToast();
  const bulkSchedule = useBulkSchedule();

  const [selectedPosition, setSelectedPosition] = React.useState<string>("");
  const [sendNotifications, setSendNotifications] = React.useState(true);
  const [results, setResults] = React.useState<BulkScheduleResult[] | null>(null);
  const [step, setStep] = React.useState<"select" | "results">("select");

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedPosition("");
      setSendNotifications(true);
      setResults(null);
      setStep("select");
    }
  }, [open]);

  // Filter out already scheduled users
  const validMembers = React.useMemo(() => {
    return selectedMembers.filter(
      (member) => !existingUserIds.includes(member.userId)
    );
  }, [selectedMembers, existingUserIds]);

  const alreadyScheduledMembers = React.useMemo(() => {
    return selectedMembers.filter((member) =>
      existingUserIds.includes(member.userId)
    );
  }, [selectedMembers, existingUserIds]);

  const handleSubmit = async () => {
    if (validMembers.length === 0) {
      toast({
        title: "Nenhum membro válido",
        description: "Todos os membros selecionados já estão escalados.",
        variant: "destructive",
      });
      return;
    }

    const schedules: BulkScheduleItem[] = validMembers.map((member) => ({
      userId: member.userId,
      ministryId: member.ministryId,
      position: selectedPosition || undefined,
    }));

    try {
      const response = await bulkSchedule.mutateAsync({
        eventId,
        schedules,
        sendNotifications,
      });

      setResults(response.results);
      setStep("results");

      // Show summary toast
      if (response.summary.failed === 0) {
        toast({
          title: "Escalas criadas com sucesso!",
          description: `${response.summary.success} membro(s) escalado(s).`,
        });
      } else {
        toast({
          title: "Escalas criadas com avisos",
          description: `${response.summary.success} sucesso, ${response.summary.failed} falha(s).`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao criar escalas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (results && results.some((r) => r.success)) {
      onComplete();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Escalar Selecionados ({selectedMembers.length})
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Configure as opções e crie as escalas para os membros selecionados."
              : "Veja o resultado de cada escala criada."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <>
            <div className="space-y-4 py-4">
              {/* Members to schedule */}
              <div className="space-y-2">
                <Label>Membros a escalar ({validMembers.length})</Label>
                <ScrollArea className="max-h-[180px] rounded-lg border border-border p-2">
                  <div className="space-y-2">
                    {validMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                      >
                        <Avatar className="h-8 w-8">
                          {member.userImage && (
                            <AvatarImage
                              src={member.userImage}
                              alt={member.userName || ""}
                            />
                          )}
                          <AvatarFallback className="bg-secondary text-white text-xs">
                            {getInitials(member.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.userName || member.userEmail}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.ministryName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Already scheduled warning */}
              {alreadyScheduledMembers.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">
                      {alreadyScheduledMembers.length} membro(s) já escalado(s)
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {alreadyScheduledMembers.map((m) => m.userName || m.userEmail).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Position Selection */}
              {positions.length > 0 && (
                <div className="space-y-2">
                  <Label>Função (opcional)</Label>
                  <Select
                    value={selectedPosition}
                    onValueChange={setSelectedPosition}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma função específica</SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Send Notifications */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-notifications"
                  checked={sendNotifications}
                  onCheckedChange={(checked) =>
                    setSendNotifications(checked === true)
                  }
                />
                <label
                  htmlFor="send-notifications"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enviar notificações por email
                </label>
              </div>

              {/* Info about conflicts */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Conflitos de horário com outros eventos serão verificados e
                  exibidos como avisos, mas não impedem a criação da escala.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validMembers.length === 0 || bulkSchedule.isPending}
                className="bg-primary hover:bg-primary-hover"
              >
                {bulkSchedule.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Escalando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Escalar {validMembers.length} Membro(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results step */}
            <div className="space-y-4 py-4">
              <ScrollArea className="max-h-[300px] rounded-lg border border-border">
                <div className="space-y-2 p-2">
                  {results?.map((result, index) => {
                    const member = selectedMembers.find(
                      (m) =>
                        m.userId === result.userId &&
                        m.ministryId === result.ministryId
                    );
                    return (
                      <div
                        key={`${result.userId}-${result.ministryId}-${index}`}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border",
                          result.success
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-red-500/5 border-red-500/20"
                        )}
                      >
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                            result.success ? "bg-emerald-500/20" : "bg-red-500/20"
                          )}
                        >
                          {result.success ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {member?.userName || member?.userEmail || "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member?.ministryName || "Ministério"}
                          </p>
                          {result.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {result.error}
                            </p>
                          )}
                          {result.warnings && result.warnings.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {result.warnings.map((warning, wIndex) => (
                                <div
                                  key={wIndex}
                                  className="flex items-center gap-1.5"
                                >
                                  <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                  <p className="text-xs text-amber-500">
                                    {warning}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {result.success && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          >
                            Criado
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Summary */}
              {results && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Resumo</span>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    >
                      {results.filter((r) => r.success).length} sucesso
                    </Badge>
                    {results.filter((r) => !r.success).length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-500 border-red-500/20"
                      >
                        {results.filter((r) => !r.success).length} falha(s)
                      </Badge>
                    )}
                    {results.filter((r) => r.warnings && r.warnings.length > 0)
                      .length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                      >
                        {
                          results.filter(
                            (r) => r.warnings && r.warnings.length > 0
                          ).length
                        }{" "}
                        aviso(s)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BulkScheduleDialog;
