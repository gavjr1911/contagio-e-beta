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
      <DialogContent className="bg-beta-navy border-beta-gray-blue/20 max-w-[340px] mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <PartyPopper className="h-8 w-8 text-emerald-400" />
          </div>
          <DialogTitle className="text-xl text-beta-cream">
            Confirmar presenca?
          </DialogTitle>
          <DialogDescription className="text-beta-gray-blue">
            {eventName ? (
              <>
                Voce esta confirmando sua presenca em{" "}
                <span className="text-beta-terracotta font-medium">
                  {eventName}
                </span>
                .
              </>
            ) : (
              "Voce esta confirmando sua presenca nesta escala."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
          <p className="text-emerald-400 text-sm">
            Obrigado por servir! Sua dedicacao faz a diferenca em nossa igreja.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-beta-gray-blue/30 text-beta-gray-blue hover:bg-beta-gray-blue/10"
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
                Confirmar presenca
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
