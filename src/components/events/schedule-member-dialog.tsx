"use client";

import * as React from "react";
import { Search, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMinistries, type Ministry, type MinistryMember } from "@/hooks/use-ministries";

interface ScheduleMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (userId: string, ministryId: string, position: string | null) => void;
  eventId: string;
  selectedMinistryId?: string;
  isLoading?: boolean;
  existingUserIds?: string[]; // Users already scheduled
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

export function ScheduleMemberDialog({
  open,
  onOpenChange,
  onSchedule,
  eventId,
  selectedMinistryId,
  isLoading = false,
  existingUserIds = [],
}: ScheduleMemberDialogProps) {
  const [search, setSearch] = React.useState("");
  const [selectedMinistry, setSelectedMinistry] = React.useState<string>(
    selectedMinistryId || ""
  );
  const [selectedMember, setSelectedMember] = React.useState<string>("");
  const [selectedPosition, setSelectedPosition] = React.useState<string>("");

  // Fetch ministries with members
  const { data: ministries, isLoading: ministriesLoading } = useMinistries();

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedMinistry(selectedMinistryId || "");
      setSelectedMember("");
      setSelectedPosition("");
    }
  }, [open, selectedMinistryId]);

  // Get current ministry data
  const currentMinistry = React.useMemo(() => {
    if (!ministries || !selectedMinistry) return null;
    return ministries.find((m) => m.id === selectedMinistry);
  }, [ministries, selectedMinistry]);

  // Filter members based on search and selected ministry
  const filteredMembers = React.useMemo(() => {
    if (!currentMinistry?.members) return [];

    let filtered = currentMinistry.members.filter((m) => m.active);

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((m) =>
        m.user.name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [currentMinistry, search]);

  // Get positions for selected ministry
  const positions = React.useMemo(() => {
    if (!currentMinistry?.positions) return [];
    return currentMinistry.positions;
  }, [currentMinistry]);

  // Check if member is already scheduled
  const isMemberScheduled = React.useCallback((userId: string) => {
    return existingUserIds.includes(userId);
  }, [existingUserIds]);

  const handleSubmit = () => {
    if (selectedMember && selectedMinistry) {
      onSchedule(selectedMember, selectedMinistry, selectedPosition || null);
    }
  };

  const canSubmit = selectedMember && selectedMinistry && !isMemberScheduled(selectedMember);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Escalar Membro</DialogTitle>
          <DialogDescription>
            Selecione um membro para escalar neste evento.
          </DialogDescription>
        </DialogHeader>

        {ministriesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Ministry Select */}
            <div className="space-y-2">
              <Label>Ministerio</Label>
              <div className="flex flex-wrap gap-2">
                {ministries?.map((ministry) => (
                  <button
                    key={ministry.id}
                    onClick={() => {
                      setSelectedMinistry(ministry.id);
                      setSelectedMember("");
                      setSelectedPosition("");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      selectedMinistry === ministry.id
                        ? "bg-primary text-white border-primary"
                        : "bg-background border-border hover:bg-muted"
                    )}
                  >
                    {ministry.name}
                  </button>
                ))}
              </div>
              {(!ministries || ministries.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Nenhum ministerio encontrado
                </p>
              )}
            </div>

            {/* Position Select */}
            {selectedMinistry && positions.length > 0 && (
              <div className="space-y-2">
                <Label>Posicao/Funcao (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedPosition("")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      !selectedPosition
                        ? "bg-secondary text-white border-secondary"
                        : "bg-background border-border hover:bg-muted"
                    )}
                  >
                    Nenhuma
                  </button>
                  {positions.map((position) => (
                    <button
                      key={position.id}
                      onClick={() => setSelectedPosition(position.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                        selectedPosition === position.name
                          ? "bg-secondary text-white border-secondary"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      {position.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Member Search */}
            {selectedMinistry && (
              <div className="space-y-2">
                <Label>Membro</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar membro..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2 mt-3">
                  {filteredMembers.map((member) => {
                    const isScheduled = isMemberScheduled(member.userId);
                    return (
                      <button
                        key={member.id}
                        onClick={() => !isScheduled && setSelectedMember(member.userId)}
                        disabled={isScheduled}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                          selectedMember === member.userId
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted",
                          isScheduled &&
                            "opacity-60 cursor-not-allowed bg-amber-500/5 border-amber-500/30"
                        )}
                      >
                        <Avatar className="h-9 w-9">
                          {member.user.image && (
                            <AvatarImage src={member.user.image} alt={member.user.name || ""} />
                          )}
                          <AvatarFallback className="bg-secondary text-white text-xs">
                            {getInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {member.user.name || member.user.email}
                            </p>
                            {isScheduled && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          {member.positions.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.positions.map((p) => p.position.name).join(", ")}
                            </p>
                          )}
                          {isScheduled && (
                            <p className="text-xs text-amber-500">
                              Ja escalado neste evento
                            </p>
                          )}
                        </div>

                        {selectedMember === member.userId && (
                          <Badge className="bg-primary text-white">
                            Selecionado
                          </Badge>
                        )}
                      </button>
                    );
                  })}

                  {filteredMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {currentMinistry?.members?.length === 0
                        ? "Nenhum membro neste ministerio"
                        : "Nenhum membro encontrado"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="bg-primary hover:bg-primary-hover"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Escalando...
              </>
            ) : (
              "Escalar Membro"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
