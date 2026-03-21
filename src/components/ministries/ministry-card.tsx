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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Ministry, getMinistryTypeLabel } from "@/hooks/use-ministries";

interface MinistryCardProps {
  ministry: Ministry;
}

export function MinistryCard({ ministry }: MinistryCardProps) {
  const memberCount = ministry._count?.members ?? ministry.members?.length ?? 0;

  return (
    <Link href={`/ministerios/${ministry.id}`}>
      <Card className="group cursor-pointer border-beta-navy/20 bg-beta-cream/5 transition-all hover:border-beta-terracotta/50 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-semibold text-beta-black group-hover:text-beta-terracotta">
              {ministry.name}
            </CardTitle>
            <Badge
              variant="secondary"
              className="shrink-0 bg-beta-navy/10 text-beta-navy"
            >
              {getMinistryTypeLabel(ministry.type)}
            </Badge>
          </div>
          {ministry.description && (
            <CardDescription className="line-clamp-2 text-beta-navy/70">
              {ministry.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leader info */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-beta-navy/10">
              <User className="h-4 w-4 text-beta-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-beta-navy/60">Lider</p>
              {ministry.leader ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ministry.leader.image || undefined} />
                    <AvatarFallback className="bg-beta-terracotta text-white text-xs">
                      {ministry.leader.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-beta-black">
                    {ministry.leader.name || ministry.leader.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-beta-navy/50 italic">
                  Sem lider definido
                </span>
              )}
            </div>
          </div>

          {/* Members count */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-beta-terracotta/10">
              <Users className="h-4 w-4 text-beta-terracotta" />
            </div>
            <div>
              <p className="text-xs text-beta-navy/60">Membros</p>
              <p className="text-sm font-medium text-beta-black">
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
    <Card className="border-beta-navy/20 bg-beta-cream/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
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
