"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useAllPositions,
  type PositionWithMinistry,
} from "@/hooks/use-ministries";
import { useEventVacancies } from "@/hooks/use-vacancies";

export interface VacancyConfig {
  id?: string; // Present for existing vacancies, absent for new ones
  ministryId: string;
  positionId: string;
  quantity: number; // Always 1 for checkbox-based selection
}

interface VacancyManagerProps {
  eventId?: string;
  onChange?: (vacancies: VacancyConfig[]) => void;
  readOnly?: boolean;
}

interface PositionCheckboxProps {
  position: PositionWithMinistry;
  isSelected: boolean;
  onToggle: (position: PositionWithMinistry, selected: boolean) => void;
  readOnly?: boolean;
}

function PositionCheckbox({
  position,
  isSelected,
  onToggle,
  readOnly = false,
}: PositionCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => !readOnly && onToggle(position, !isSelected)}
      disabled={readOnly}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left",
        isSelected
          ? "bg-primary/10 border-primary/30 text-foreground"
          : "bg-background border-border hover:bg-secondary/50 text-muted-foreground",
        readOnly && "cursor-default opacity-70"
      )}
    >
      {/* Checkbox indicator */}
      <div
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded border-2 transition-colors",
          isSelected
            ? "bg-primary border-primary"
            : "bg-background border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>

      {/* Position info */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium", isSelected && "text-foreground")}>
          {position.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {position.ministry.name}
        </p>
      </div>
    </button>
  );
}

export function VacancyManager({
  eventId,
  onChange,
  readOnly = false,
}: VacancyManagerProps) {
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Fetch all positions
  const { data: allPositions, isLoading: positionsLoading } = useAllPositions();

  // Load existing vacancies if editing an event
  const { data: existingVacancies, isLoading: vacanciesLoading } = useEventVacancies(
    eventId || ""
  );

  // Initialize from existing vacancies
  useEffect(() => {
    if (eventId && existingVacancies && !initialized) {
      const positionIds = new Set(existingVacancies.map((v) => v.positionId));
      setSelectedPositions(positionIds);
      setInitialized(true);
    } else if (!eventId && !initialized) {
      setInitialized(true);
    }
  }, [eventId, existingVacancies, initialized]);

  // Notify parent of changes
  useEffect(() => {
    if (initialized && onChange && allPositions) {
      const vacancies: VacancyConfig[] = [];
      for (const position of allPositions) {
        if (selectedPositions.has(position.id)) {
          // Check if this is an existing vacancy
          const existingVacancy = existingVacancies?.find(
            (v) => v.positionId === position.id
          );
          vacancies.push({
            id: existingVacancy?.id, // Include id for existing vacancies
            ministryId: position.ministry.id,
            positionId: position.id,
            quantity: 1,
          });
        }
      }
      onChange(vacancies);
    }
  }, [selectedPositions, initialized, onChange, allPositions, existingVacancies]);

  const handleToggle = useCallback(
    (position: PositionWithMinistry, selected: boolean) => {
      setSelectedPositions((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(position.id);
        } else {
          newSet.delete(position.id);
        }
        return newSet;
      });
    },
    []
  );

  // Group positions by ministry
  const groupedPositions = useMemo(() => {
    if (!allPositions) return new Map<string, PositionWithMinistry[]>();

    const groups = new Map<string, PositionWithMinistry[]>();
    for (const position of allPositions) {
      const ministryName = position.ministry.name;
      if (!groups.has(ministryName)) {
        groups.set(ministryName, []);
      }
      groups.get(ministryName)!.push(position);
    }
    return groups;
  }, [allPositions]);

  // Summary
  const summary = useMemo(() => {
    const totalPositions = selectedPositions.size;
    const ministries = new Set<string>();
    if (allPositions) {
      for (const position of allPositions) {
        if (selectedPositions.has(position.id)) {
          ministries.add(position.ministry.id);
        }
      }
    }
    return { totalPositions, uniqueMinistries: ministries.size };
  }, [selectedPositions, allPositions]);

  const isLoading = positionsLoading || (eventId && vacanciesLoading);

  if (isLoading) {
    return <VacancyManagerSkeleton />;
  }

  if (!allPositions || allPositions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma funcao cadastrada nos ministerios.</p>
        <p className="text-sm mt-1">
          Cadastre funcoes nos ministerios primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Positions grouped by ministry */}
      {Array.from(groupedPositions.entries()).map(([ministryName, positions]) => (
        <div key={ministryName} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground px-1">
            {ministryName}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {positions.map((position) => (
              <PositionCheckbox
                key={position.id}
                position={position}
                isSelected={selectedPositions.has(position.id)}
                onToggle={handleToggle}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        <span className="text-sm text-muted-foreground">Selecionadas:</span>
        <Badge variant="default">
          {summary.totalPositions}{" "}
          {summary.totalPositions === 1 ? "funcao" : "funcoes"}
          {summary.uniqueMinistries > 0 && (
            <>
              {" "}de {summary.uniqueMinistries}{" "}
              {summary.uniqueMinistries === 1 ? "ministerio" : "ministerios"}
            </>
          )}
        </Badge>
      </div>
    </div>
  );
}

export function VacancyManagerSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}
