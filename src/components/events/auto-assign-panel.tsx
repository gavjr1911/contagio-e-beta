"use client";

import * as React from "react";
import { Loader2, Users, Sparkles, User } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  useAutoAssignPreview,
  useExecuteAutoAssign,
  getScoreColor,
  type AutoAssignCandidate,
  type AutoAssignVacancy,
  type AutoAssignMinistry,
} from "@/hooks/use-auto-assign";

interface AutoAssignPanelProps {
  eventId: string;
  ministryId?: string;
  onAssigned?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CandidateItem({ candidate }: { candidate: AutoAssignCandidate }) {
  const scoreColor = getScoreColor(candidate.score);

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={undefined} alt={candidate.userName} />
        <AvatarFallback className="text-xs">
          {getInitials(candidate.userName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{candidate.userName}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={candidate.score} className="h-1.5 flex-1" />
          <Badge variant={scoreColor} className="text-xs shrink-0">
            {candidate.score}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function VacancyItem({ vacancy }: { vacancy: AutoAssignVacancy }) {
  const remainingSlots = vacancy.quantity - vacancy.filled;
  const topCandidates = vacancy.candidates.slice(0, 3);

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{vacancy.positionName}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {remainingSlots} vaga{remainingSlots !== 1 ? "s" : ""}
        </Badge>
      </div>

      {topCandidates.length > 0 ? (
        <div className="space-y-1">
          {topCandidates.map((candidate) => (
            <CandidateItem key={candidate.userId} candidate={candidate} />
          ))}
          {vacancy.candidates.length > 3 && (
            <p className="text-xs text-muted-foreground pt-1">
              +{vacancy.candidates.length - 3} mais candidatos
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Nenhum candidato disponível
        </p>
      )}
    </div>
  );
}

function MinistrySection({ ministry }: { ministry: AutoAssignMinistry }) {
  const totalRemaining = ministry.vacancies.reduce(
    (acc, v) => acc + (v.quantity - v.filled),
    0
  );

  if (totalRemaining === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">{ministry.ministryName}</h3>
        <Badge variant="outline" className="ml-auto">
          {totalRemaining} vaga{totalRemaining !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ministry.vacancies
          .filter((v) => v.quantity - v.filled > 0)
          .map((vacancy) => (
            <VacancyItem key={vacancy.vacancyId} vacancy={vacancy} />
          ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((j) => (
              <div key={j} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-1.5 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">
        Nenhuma vaga configurada para este evento
      </p>
    </div>
  );
}

export function AutoAssignPanel({
  eventId,
  ministryId,
  onAssigned,
}: AutoAssignPanelProps) {
  const { toast } = useToast();
  const {
    data: preview,
    isLoading,
    error,
  } = useAutoAssignPreview(eventId, ministryId);
  const executeAutoAssign = useExecuteAutoAssign();

  const totalVacancies = React.useMemo(() => {
    if (!preview?.ministries) return 0;
    return preview.ministries.reduce(
      (acc, ministry) =>
        acc +
        ministry.vacancies.reduce(
          (vAcc, v) => vAcc + (v.quantity - v.filled),
          0
        ),
      0
    );
  }, [preview]);

  const handleExecute = async () => {
    try {
      const result = await executeAutoAssign.mutateAsync({
        eventId,
        ministryId,
      });

      toast({
        title: "Distribuição concluída",
        description: `${result.totalAssigned} membro${result.totalAssigned !== 1 ? "s" : ""} atribuído${result.totalAssigned !== 1 ? "s" : ""} com sucesso.`,
      });

      onAssigned?.();
    } catch (err) {
      toast({
        title: "Erro na distribuição",
        description:
          err instanceof Error ? err.message : "Erro ao distribuir membros",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Distribuição Automática</h2>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">
              Erro ao carregar preview: {error.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Distribuição Automática</h2>
          </div>
          <Button
            onClick={handleExecute}
            disabled={
              isLoading || executeAutoAssign.isPending || totalVacancies === 0
            }
          >
            {executeAutoAssign.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Distribuindo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Distribuir
              </>
            )}
          </Button>
        </div>
        {!isLoading && totalVacancies > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {totalVacancies} vaga{totalVacancies !== 1 ? "s" : ""} disponíve
            {totalVacancies !== 1 ? "is" : "l"} para distribuição
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !preview?.ministries || preview.ministries.length === 0 ? (
          <EmptyState />
        ) : totalVacancies === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Todas as vagas já foram preenchidas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {preview.ministries.map((ministry) => (
              <MinistrySection key={ministry.ministryId} ministry={ministry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
