"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMinistryPositions,
  useCreatePosition,
  useDeletePosition,
  useMinistry,
} from "@/hooks/use-ministries";

interface PositionsManagerProps {
  ministryId: string;
}

export function PositionsManager({ ministryId }: PositionsManagerProps) {
  const [newPosition, setNewPosition] = useState("");
  const [deletingPosition, setDeletingPosition] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: positions, isLoading } = useMinistryPositions(ministryId);
  const { data: ministry } = useMinistry(ministryId);
  const createPosition = useCreatePosition();
  const deletePosition = useDeletePosition();

  // Count members using each position
  const getMemberCount = (positionId: string): number => {
    if (!ministry?.members) return 0;
    return ministry.members.filter((member) =>
      member.positions?.some((p) => p.positionId === positionId)
    ).length;
  };

  const handleCreate = async () => {
    if (!newPosition.trim()) return;

    await createPosition.mutateAsync({
      ministryId,
      name: newPosition.trim(),
    });
    setNewPosition("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !createPosition.isPending) {
      handleCreate();
    }
  };

  const handleDelete = async () => {
    if (!deletingPosition) return;

    await deletePosition.mutateAsync({
      ministryId,
      positionId: deletingPosition.id,
    });
    setDeletingPosition(null);
  };

  if (isLoading) {
    return <PositionsManagerSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Add new position form */}
        <div className="flex gap-2">
          <Input
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome da nova funcao..."
            disabled={createPosition.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleCreate}
            disabled={!newPosition.trim() || createPosition.isPending}
            className="shrink-0"
          >
            {createPosition.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>

        {/* Positions list */}
        {!positions || positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              Nenhuma funcao cadastrada
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione funcoes para organizar os membros do ministerio.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {positions.map((position) => {
              const memberCount = getMemberCount(position.id);
              return (
                <Card
                  key={position.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {position.name}
                      </p>
                      {position.description && (
                        <p className="truncate text-sm text-muted-foreground">
                          {position.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant="secondary"
                      className="bg-secondary text-muted-foreground"
                    >
                      {memberCount} {memberCount === 1 ? "membro" : "membros"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDeletingPosition({
                          id: position.id,
                          name: position.name,
                        })
                      }
                      disabled={deletePosition.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover funcao</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPosition}
        onOpenChange={() => setDeletingPosition(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover funcao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a funcao &quot;{deletingPosition?.name}&quot;?
              {getMemberCount(deletingPosition?.id || "") > 0 && (
                <>
                  {" "}
                  Esta funcao esta sendo usada por{" "}
                  {getMemberCount(deletingPosition?.id || "")}{" "}
                  {getMemberCount(deletingPosition?.id || "") === 1
                    ? "membro"
                    : "membros"}
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingPosition(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePosition.isPending}
            >
              {deletePosition.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PositionsManagerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Skeleton for input + button */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Skeleton for position cards */}
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
