"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMinistries,
  useMinistryPositions,
  type Ministry,
  type MinistryPosition,
} from "@/hooks/use-ministries";
import { useEventVacancies, type EventVacancy } from "@/hooks/use-vacancies";

export interface VacancyConfig {
  ministryId: string;
  positionId: string;
  quantity: number;
}

interface VacancyManagerProps {
  eventId?: string;
  ministries: Ministry[];
  onChange?: (vacancies: VacancyConfig[]) => void;
  readOnly?: boolean;
}

interface MinistryAccordionProps {
  ministry: Ministry;
  vacancies: VacancyConfig[];
  onVacancyChange: (ministryId: string, positionId: string, quantity: number) => void;
  readOnly?: boolean;
  defaultExpanded?: boolean;
}

function MinistryAccordion({
  ministry,
  vacancies,
  onVacancyChange,
  readOnly = false,
  defaultExpanded = false,
}: MinistryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { data: positions, isLoading: positionsLoading } = useMinistryPositions(ministry.id);

  // Calculate total vacancies for this ministry
  const totalVacancies = useMemo(() => {
    return vacancies
      .filter((v) => v.ministryId === ministry.id && v.quantity > 0)
      .reduce((sum, v) => sum + v.quantity, 0);
  }, [vacancies, ministry.id]);

  const getQuantity = useCallback(
    (positionId: string): number => {
      const vacancy = vacancies.find(
        (v) => v.ministryId === ministry.id && v.positionId === positionId
      );
      return vacancy?.quantity || 0;
    },
    [vacancies, ministry.id]
  );

  const handleQuantityChange = (positionId: string, value: string) => {
    const quantity = Math.max(0, parseInt(value) || 0);
    onVacancyChange(ministry.id, positionId, quantity);
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
        disabled={readOnly && !isExpanded}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">{ministry.name}</span>
        </div>
        {totalVacancies > 0 && (
          <Badge variant="secondary">
            {totalVacancies} {totalVacancies === 1 ? "vaga" : "vagas"}
          </Badge>
        )}
      </button>

      {isExpanded && (
        <CardContent className="border-t border-border pt-4">
          {positionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          ) : !positions || positions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma posicao cadastrada neste ministerio.
            </p>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between gap-4"
                >
                  <Label
                    htmlFor={`vacancy-${ministry.id}-${position.id}`}
                    className="flex-1 text-sm font-normal text-foreground"
                  >
                    {position.name}
                  </Label>
                  <Input
                    id={`vacancy-${ministry.id}-${position.id}`}
                    type="number"
                    min="0"
                    value={getQuantity(position.id)}
                    onChange={(e) => handleQuantityChange(position.id, e.target.value)}
                    disabled={readOnly}
                    className="w-20 text-center"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function VacancyManager({
  eventId,
  ministries,
  onChange,
  readOnly = false,
}: VacancyManagerProps) {
  const [vacancies, setVacancies] = useState<VacancyConfig[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load existing vacancies if editing an event
  const { data: existingVacancies, isLoading: vacanciesLoading } = useEventVacancies(
    eventId || ""
  );

  // Initialize vacancies from existing data
  useEffect(() => {
    if (eventId && existingVacancies && !initialized) {
      const configs: VacancyConfig[] = existingVacancies.map((v) => ({
        ministryId: v.ministryId,
        positionId: v.positionId,
        quantity: v.quantity,
      }));
      setVacancies(configs);
      setInitialized(true);
    } else if (!eventId && !initialized) {
      setInitialized(true);
    }
  }, [eventId, existingVacancies, initialized]);

  // Notify parent of changes
  useEffect(() => {
    if (initialized && onChange) {
      onChange(vacancies);
    }
  }, [vacancies, initialized, onChange]);

  const handleVacancyChange = useCallback(
    (ministryId: string, positionId: string, quantity: number) => {
      setVacancies((prev) => {
        const existingIndex = prev.findIndex(
          (v) => v.ministryId === ministryId && v.positionId === positionId
        );

        if (existingIndex >= 0) {
          // Update existing
          const updated = [...prev];
          if (quantity === 0) {
            // Remove if quantity is 0
            updated.splice(existingIndex, 1);
          } else {
            updated[existingIndex] = { ministryId, positionId, quantity };
          }
          return updated;
        } else if (quantity > 0) {
          // Add new
          return [...prev, { ministryId, positionId, quantity }];
        }
        return prev;
      });
    },
    []
  );

  // Calculate summary
  const summary = useMemo(() => {
    const activeVacancies = vacancies.filter((v) => v.quantity > 0);
    const totalVacancies = activeVacancies.reduce((sum, v) => sum + v.quantity, 0);
    const uniqueMinistries = new Set(activeVacancies.map((v) => v.ministryId)).size;
    return { totalVacancies, uniqueMinistries };
  }, [vacancies]);

  if (eventId && vacanciesLoading) {
    return <VacancyManagerSkeleton />;
  }

  if (!ministries || ministries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum ministerio disponivel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ministry list with accordions */}
      <div className="space-y-3">
        {ministries.map((ministry) => (
          <MinistryAccordion
            key={ministry.id}
            ministry={ministry}
            vacancies={vacancies}
            onVacancyChange={handleVacancyChange}
            readOnly={readOnly}
            defaultExpanded={
              // Expand if has vacancies
              vacancies.some((v) => v.ministryId === ministry.id && v.quantity > 0)
            }
          />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">Total:</span>
        <Badge variant="default">
          {summary.totalVacancies} {summary.totalVacancies === 1 ? "vaga" : "vagas"} em{" "}
          {summary.uniqueMinistries}{" "}
          {summary.uniqueMinistries === 1 ? "ministerio" : "ministerios"}
        </Badge>
      </div>
    </div>
  );
}

export function VacancyManagerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}
