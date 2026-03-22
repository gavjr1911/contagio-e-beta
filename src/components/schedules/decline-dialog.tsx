"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecline: (reason?: string) => void;
  isLoading?: boolean;
  eventName?: string;
}

export function DeclineDialog({
  open,
  onOpenChange,
  onDecline,
  isLoading = false,
  eventName,
}: DeclineDialogProps) {
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDecline = () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    onDecline(reason || undefined);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setReason("");
      setShowConfirmation(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-[340px] mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            {showConfirmation ? "Tem certeza?" : "Recusar escala?"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {showConfirmation ? (
              "Esta acao nao pode ser desfeita. O lider do ministerio sera notificado."
            ) : eventName ? (
              <>
                Voce esta recusando sua participacao em{" "}
                <span className="text-primary font-medium">
                  {eventName}
                </span>
                .
              </>
            ) : (
              "Voce esta recusando sua participacao nesta escala."
            )}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation && (
          <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="text-foreground text-sm font-medium"
            >
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Conte-nos o motivo, se quiser..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 min-h-[100px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Isso ajuda os lideres a entenderem sua disponibilidade.
            </p>
          </div>
        )}

        {showConfirmation && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <p className="text-red-400 text-sm">
              Ao confirmar, voce sera removido desta escala e o lider podera
              escalar outro voluntario.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() =>
              showConfirmation
                ? setShowConfirmation(false)
                : handleClose(false)
            }
            disabled={isLoading}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {showConfirmation ? "Voltar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleDecline}
            disabled={isLoading}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Recusando...
              </span>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                {showConfirmation ? "Sim, recusar" : "Recusar escala"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
