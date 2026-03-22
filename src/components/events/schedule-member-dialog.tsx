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

interface Ministry {
  id: string;
  name: string;
  positions: string[];
}

interface Member {
  id: string;
  name: string;
  avatar?: string;
  ministries: string[];
  hasConflict?: boolean;
  conflictDescription?: string;
}

interface ScheduleMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (memberId: string, ministryId: string, position: string) => void;
  ministries: Ministry[];
  members: Member[];
  selectedMinistryId?: string;
  isLoading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Mock data for demonstration
const mockMinistries: Ministry[] = [
  {
    id: "m1",
    name: "Louvor",
    positions: ["Vocal", "Guitarra", "Baixo", "Bateria", "Teclado"],
  },
  {
    id: "m2",
    name: "Som e Midia",
    positions: ["Operador de Som", "Projecao", "Transmissao"],
  },
  {
    id: "m3",
    name: "Recepcao",
    positions: ["Recepcionista", "Diacono"],
  },
];

const mockMembers: Member[] = [
  { id: "u1", name: "Ana Silva", ministries: ["m1"], hasConflict: false },
  { id: "u2", name: "Carlos Santos", ministries: ["m1", "m2"], hasConflict: false },
  {
    id: "u3",
    name: "Julia Oliveira",
    ministries: ["m1"],
    hasConflict: true,
    conflictDescription: "Ja escalada no Ensaio Louvor",
  },
  { id: "u4", name: "Pedro Costa", ministries: ["m2"], hasConflict: false },
  { id: "u5", name: "Marina Lima", ministries: ["m2"], hasConflict: false },
  { id: "u6", name: "Roberto Alves", ministries: ["m3"], hasConflict: false },
  { id: "u7", name: "Fernanda Souza", ministries: ["m3"], hasConflict: false },
];

export function ScheduleMemberDialog({
  open,
  onOpenChange,
  onSchedule,
  ministries = mockMinistries,
  members = mockMembers,
  selectedMinistryId,
  isLoading = false,
}: ScheduleMemberDialogProps) {
  const [search, setSearch] = React.useState("");
  const [selectedMinistry, setSelectedMinistry] = React.useState<string>(
    selectedMinistryId || ""
  );
  const [selectedMember, setSelectedMember] = React.useState<string>("");
  const [selectedPosition, setSelectedPosition] = React.useState<string>("");

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedMinistry(selectedMinistryId || "");
      setSelectedMember("");
      setSelectedPosition("");
    }
  }, [open, selectedMinistryId]);

  // Filter members based on search and selected ministry
  const filteredMembers = React.useMemo(() => {
    let filtered = [...members];

    // Filter by ministry
    if (selectedMinistry) {
      filtered = filtered.filter((m) =>
        m.ministries.includes(selectedMinistry)
      );
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [members, selectedMinistry, search]);

  // Get positions for selected ministry
  const positions = React.useMemo(() => {
    if (!selectedMinistry) return [];
    const ministry = ministries.find((m) => m.id === selectedMinistry);
    return ministry?.positions || [];
  }, [ministries, selectedMinistry]);

  const handleSubmit = () => {
    if (selectedMember && selectedMinistry && selectedPosition) {
      onSchedule(selectedMember, selectedMinistry, selectedPosition);
      onOpenChange(false);
    }
  };

  const canSubmit = selectedMember && selectedMinistry && selectedPosition;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Escalar Membro</DialogTitle>
          <DialogDescription>
            Selecione um membro para escalar neste evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ministry Select */}
          <div className="space-y-2">
            <Label>Ministerio</Label>
            <div className="flex flex-wrap gap-2">
              {ministries.map((ministry) => (
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
          </div>

          {/* Position Select */}
          {selectedMinistry && (
            <div className="space-y-2">
              <Label>Posicao/Funcao</Label>
              <div className="flex flex-wrap gap-2">
                {positions.map((position) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      selectedPosition === position
                        ? "bg-secondary text-white border-secondary"
                        : "bg-background border-border hover:bg-muted"
                    )}
                  >
                    {position}
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
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member.id)}
                    disabled={member.hasConflict}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      selectedMember === member.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                      member.hasConflict &&
                        "opacity-60 cursor-not-allowed bg-amber-500/5 border-amber-500/30"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      {member.avatar && (
                        <AvatarImage src={member.avatar} alt={member.name} />
                      )}
                      <AvatarFallback className="bg-secondary text-white text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {member.name}
                        </p>
                        {member.hasConflict && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {member.hasConflict && member.conflictDescription && (
                        <p className="text-xs text-amber-500">
                          {member.conflictDescription}
                        </p>
                      )}
                    </div>

                    {selectedMember === member.id && (
                      <Badge className="bg-primary text-white">
                        Selecionado
                      </Badge>
                    )}
                  </button>
                ))}

                {filteredMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro encontrado
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

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
