"use client";

import Link from "next/link";
import { Users, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Ministry } from "@/hooks/use-ministries";

interface MinistryCardProps {
  ministry: Ministry;
}

export function MinistryCard({ ministry }: MinistryCardProps) {
  const memberCount = ministry._count?.members ?? ministry.members?.length ?? 0;

  return (
    <Link href={`/ministerios/${ministry.id}`}>
      <Card className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
            {ministry.name}
          </CardTitle>
          {ministry.description && (
            <CardDescription className="line-clamp-2 text-muted-foreground">
              {ministry.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leader info */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Lider</p>
              {ministry.leader ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 ring-2 ring-primary/20">
                    <AvatarImage src={ministry.leader.image || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {ministry.leader.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-foreground">
                    {ministry.leader.name || ministry.leader.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Sem lider definido
                </span>
              )}
            </div>
          </div>

          {/* Members count */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Membros</p>
              <p className="text-sm font-medium text-foreground">
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MinistryCardSkeleton() {
  return (
    <Card className="border-border bg-card animate-pulse">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-12" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
