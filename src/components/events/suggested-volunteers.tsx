"use client";

import * as React from "react";
import {
  Loader2,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  TrendingUp,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useSuggestions,
  useQuickAssign,
  getScoreClassName,
  getScoreLabel,
  formatLastScheduled,
  type VolunteerSuggestion,
} from "@/hooks/use-suggestions";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SuggestedVolunteersProps {
  eventId: string;
  ministryId: string;
  positionId?: string;
  vacancyId?: string;
  positionName?: string;
  onScheduleSuccess?: () => void;
  limit?: number;
  compact?: boolean;
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

function ScoreTooltip({ factors }: { factors: VolunteerSuggestion["factors"] }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium mb-2">Detalhes do Score</div>
      <div className="flex justify-between gap-4">
        <span>Disponibilidade:</span>
        <span className="font-medium">{factors.availability}/30</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Frequência:</span>
        <span className="font-medium">{factors.frequency}/25</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Histórico:</span>
        <span className="font-medium">{factors.history}/20</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Conflitos:</span>
        <span className="font-medium">{factors.timeConflict}/15</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Função:</span>
        <span className="font-medium">{factors.positionMatch}/10</span>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onSchedule,
  isScheduling,
  compact = false,
}: {
  suggestion: VolunteerSuggestion;
  onSchedule: () => void;
  isScheduling: boolean;
  compact?: boolean;
}) {
  const scoreColor = getScoreClassName(suggestion.score);
  const scoreLabel = getScoreLabel(suggestion.score);

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
        <Avatar className="h-8 w-8">
          {suggestion.userImage && (
            <AvatarImage src={suggestion.userImage} alt={suggestion.userName || ""} />
          )}
          <AvatarFallback className="bg-secondary text-white text-xs">
            {getInitials(suggestion.userName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {suggestion.userName || suggestion.userEmail}
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn("text-xs cursor-help", scoreColor)}
              >
                {suggestion.score}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left">
              <ScoreTooltip factors={suggestion.factors} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
          onClick={onSchedule}
          disabled={isScheduling}
        >
          {isScheduling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="group p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all bg-background/50">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          {suggestion.userImage && (
            <AvatarImage src={suggestion.userImage} alt={suggestion.userName || ""} />
          )}
          <AvatarFallback className="bg-secondary text-white text-sm">
            {getInitials(suggestion.userName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              {suggestion.userName || suggestion.userEmail}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn("text-xs cursor-help", scoreColor)}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {suggestion.score} - {scoreLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <ScoreTooltip factors={suggestion.factors} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {suggestion.reason}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {suggestion.positions.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {suggestion.positions.slice(0, 2).join(", ")}
                {suggestion.positions.length > 2 && ` +${suggestion.positions.length - 2}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {suggestion.ministrySchedules}x neste ministério
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatLastScheduled(suggestion.lastScheduledAt)}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onSchedule}
          disabled={isScheduling}
        >
          {isScheduling ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <UserPlus className="h-4 w-4 mr-1" />
          )}
          Escalar
        </Button>
      </div>
    </div>
  );
}

export function SuggestedVolunteers({
  eventId,
  ministryId,
  positionId,
  vacancyId,
  positionName,
  onScheduleSuccess,
  limit = 5,
  compact = false,
}: SuggestedVolunteersProps) {
  const { toast } = useToast();
  const [schedulingUserId, setSchedulingUserId] = React.useState<string | null>(null);

  const {
    data: suggestionsData,
    isLoading,
    error,
    refetch,
  } = useSuggestions(eventId, ministryId, positionId, { limit });

  const quickAssign = useQuickAssign();

  const handleSchedule = async (suggestion: VolunteerSuggestion) => {
    setSchedulingUserId(suggestion.userId);
    try {
      await quickAssign.mutateAsync({
        eventId,
        userId: suggestion.userId,
        ministryId,
        vacancyId,
        position: positionName,
      });

      toast({
        title: "Voluntário escalado",
        description: `${suggestion.userName || suggestion.userEmail} foi escalado com sucesso.`,
      });

      refetch();
      onScheduleSuccess?.();
    } catch (error) {
      toast({
        title: "Erro ao escalar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSchedulingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Carregando sugestões...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Erro ao carregar sugestões</span>
      </div>
    );
  }

  if (!suggestionsData || suggestionsData.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma sugestão disponível
        </p>
        <p className="text-xs text-muted-foreground/70">
          Todos os membros disponíveis já estão escalados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Voluntários Sugeridos</h4>
        <Badge variant="secondary" className="text-xs">
          {suggestionsData.total} disponíveis
        </Badge>
      </div>

      <div className={cn("space-y-2", compact && "space-y-1")}>
        {suggestionsData.suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.userId}
            suggestion={suggestion}
            onSchedule={() => handleSchedule(suggestion)}
            isScheduling={schedulingUserId === suggestion.userId}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// POPOVER VERSION FOR VACANCY SLOTS
// ============================================

interface SuggestionsPopoverContentProps {
  eventId: string;
  ministryId: string;
  positionId?: string;
  vacancyId?: string;
  positionName?: string;
  onScheduleSuccess?: () => void;
  onClose?: () => void;
}

export function SuggestionsPopoverContent({
  eventId,
  ministryId,
  positionId,
  vacancyId,
  positionName,
  onScheduleSuccess,
  onClose,
}: SuggestionsPopoverContentProps) {
  const { toast } = useToast();
  const [schedulingUserId, setSchedulingUserId] = React.useState<string | null>(null);

  const {
    data: suggestionsData,
    isLoading,
    error,
    refetch,
  } = useSuggestions(eventId, ministryId, positionId, { limit: 5 });

  const quickAssign = useQuickAssign();

  const handleSchedule = async (suggestion: VolunteerSuggestion) => {
    setSchedulingUserId(suggestion.userId);
    try {
      await quickAssign.mutateAsync({
        eventId,
        userId: suggestion.userId,
        ministryId,
        vacancyId,
        position: positionName,
      });

      toast({
        title: "Voluntário escalado",
        description: `${suggestion.userName || suggestion.userEmail} foi escalado com sucesso.`,
      });

      refetch();
      onScheduleSuccess?.();
      onClose?.();
    } catch (error) {
      toast({
        title: "Erro ao escalar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSchedulingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Erro ao carregar sugestões
      </div>
    );
  }

  if (!suggestionsData || suggestionsData.suggestions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Nenhuma sugestão disponível
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
      <div className="flex items-center gap-2 px-2 py-1 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Sugeridos</span>
      </div>
      {suggestionsData.suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.userId}
          suggestion={suggestion}
          onSchedule={() => handleSchedule(suggestion)}
          isScheduling={schedulingUserId === suggestion.userId}
          compact
        />
      ))}
    </div>
  );
}
