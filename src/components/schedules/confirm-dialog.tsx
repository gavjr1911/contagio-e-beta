"use client";

import { Check, PartyPopper } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  eventName?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  eventName,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[340px] mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <PartyPopper className="h-8 w-8 text-emerald-400" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            Confirmar presença?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {eventName ? (
              <>
                Você está confirmando sua presença em{" "}
                <span className="text-primary font-medium">
                  {eventName}
                </span>
                .
              </>
            ) : (
              "Você está confirmando sua presença nesta escala."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
          <p className="text-emerald-400 text-sm">
            Obrigado por servir! Sua dedicação faz a diferença em nossa igreja.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Confirmando...
              </span>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar presença
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
