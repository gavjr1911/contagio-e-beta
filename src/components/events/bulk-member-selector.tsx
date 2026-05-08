"use client";

import * as React from "react";
import { Search, Users, CheckSquare, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMinistries, type Ministry, type MinistryMember } from "@/hooks/use-ministries";
import type { SelectedMember } from "./bulk-schedule-dialog";

interface BulkMemberSelectorProps {
  selectedMembers: SelectedMember[];
  onSelectionChange: (members: SelectedMember[]) => void;
  existingUserIds: string[];
  selectedMinistryId?: string;
  onOpenBulkDialog: () => void;
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

export function BulkMemberSelector({
  selectedMembers,
  onSelectionChange,
  existingUserIds,
  selectedMinistryId,
  onOpenBulkDialog,
}: BulkMemberSelectorProps) {
  const [search, setSearch] = React.useState("");
  const [selectedMinistry, setSelectedMinistry] = React.useState<string>(
    selectedMinistryId || ""
  );

  const { data: ministries, isLoading } = useMinistries();

  // Update selected ministry when prop changes
  React.useEffect(() => {
    if (selectedMinistryId && selectedMinistryId !== selectedMinistry) {
      setSelectedMinistry(selectedMinistryId);
    }
  }, [selectedMinistryId]);

  // Get current ministry data
  const currentMinistry = React.useMemo(() => {
    if (!ministries || !selectedMinistry) return null;
    return ministries.find((m) => m.id === selectedMinistry);
  }, [ministries, selectedMinistry]);

  // Filter members based on search
  const filteredMembers = React.useMemo(() => {
    if (!currentMinistry?.members) return [];

    let filtered = currentMinistry.members.filter((m) => m.active);

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((m) =>
        m.user.name?.toLowerCase().includes(searchLower) ||
        m.user.email.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [currentMinistry, search]);

  // Check if a member is selected
  const isMemberSelected = (userId: string) => {
    return selectedMembers.some((m) => m.userId === userId);
  };

  // Check if a member is already scheduled
  const isMemberScheduled = (userId: string) => {
    return existingUserIds.includes(userId);
  };

  // Toggle member selection
  const toggleMember = (member: MinistryMember, ministry: Ministry) => {
    if (isMemberScheduled(member.userId)) return;

    const isSelected = isMemberSelected(member.userId);

    if (isSelected) {
      onSelectionChange(
        selectedMembers.filter((m) => m.userId !== member.userId)
      );
    } else {
      onSelectionChange([
        ...selectedMembers,
        {
          userId: member.userId,
          userName: member.user.name,
          userImage: member.user.image,
          userEmail: member.user.email,
          ministryId: ministry.id,
          ministryName: ministry.name,
        },
      ]);
    }
  };

  // Select all available members in current ministry
  const selectAllInMinistry = () => {
    if (!currentMinistry) return;

    const availableMembers = filteredMembers.filter(
      (m) => !isMemberScheduled(m.userId)
    );

    const newSelections: SelectedMember[] = availableMembers
      .filter((m) => !isMemberSelected(m.userId))
      .map((m) => ({
        userId: m.userId,
        userName: m.user.name,
        userImage: m.user.image,
        userEmail: m.user.email,
        ministryId: currentMinistry.id,
        ministryName: currentMinistry.name,
      }));

    onSelectionChange([...selectedMembers, ...newSelections]);
  };

  // Clear selection
  const clearSelection = () => {
    onSelectionChange([]);
  };

  // Count available members (not scheduled) in current ministry
  const availableCount = React.useMemo(() => {
    return filteredMembers.filter((m) => !isMemberScheduled(m.userId)).length;
  }, [filteredMembers, existingUserIds]);

  // Count selected members in current ministry
  const selectedInMinistryCount = React.useMemo(() => {
    if (!currentMinistry) return 0;
    return selectedMembers.filter((m) => m.ministryId === currentMinistry.id).length;
  }, [selectedMembers, currentMinistry]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">
              Carregando membros...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Escalar em Lote
          </CardTitle>
          {selectedMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedMembers.length} selecionado(s)
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ministry Filter */}
        <div className="flex flex-wrap gap-2">
          {ministries?.map((ministry) => (
            <button
              key={ministry.id}
              onClick={() => setSelectedMinistry(ministry.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                selectedMinistry === ministry.id
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              {ministry.name}
              {selectedMembers.filter((m) => m.ministryId === ministry.id).length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  {selectedMembers.filter((m) => m.ministryId === ministry.id).length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {selectedMinistry && currentMinistry && (
          <>
            {/* Search and Select All */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar membro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllInMinistry}
                disabled={availableCount === 0 || selectedInMinistryCount === availableCount}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Selecionar Todos
              </Button>
            </div>

            {/* Member List */}
            <ScrollArea className="h-[250px] rounded-lg border border-border">
              <div className="p-2 space-y-2">
                {filteredMembers.map((member) => {
                  const isSelected = isMemberSelected(member.userId);
                  const isScheduled = isMemberScheduled(member.userId);

                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member, currentMinistry)}
                      disabled={isScheduled}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted",
                        isScheduled && "opacity-50 cursor-not-allowed bg-muted/30"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isScheduled}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Avatar className="h-9 w-9">
                        {member.user.image && (
                          <AvatarImage
                            src={member.user.image}
                            alt={member.user.name || ""}
                          />
                        )}
                        <AvatarFallback className="bg-secondary text-white text-xs">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.user.name || member.user.email}
                        </p>
                        {member.positions && member.positions.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.positions
                              .map((p) => p.position?.name)
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                        {isScheduled && (
                          <p className="text-xs text-amber-500">
                            Já escalado
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Badge className="bg-primary text-white text-xs">
                          Selecionado
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {search
                      ? "Nenhum membro encontrado"
                      : "Nenhum membro neste ministério"}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Button */}
            {selectedMembers.length > 0 && (
              <Button
                onClick={onOpenBulkDialog}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                <Users className="h-4 w-4 mr-2" />
                Escalar {selectedMembers.length} Membro(s)
              </Button>
            )}
          </>
        )}

        {!selectedMinistry && (
          <div className="text-center py-8 text-muted-foreground">
            Selecione um ministério para ver os membros disponíveis
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BulkMemberSelector;
