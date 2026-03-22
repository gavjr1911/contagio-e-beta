"use client";

import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  History,
  Briefcase,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberList, MemberListSkeleton } from "@/components/ministries/member-list";
import { AddMemberDialog } from "@/components/ministries/add-member-dialog";
import { PositionsManager } from "@/components/ministries/positions-manager";
import { EditMinistryDialog } from "@/components/ministries/edit-ministry-dialog";
import {
  useMinistry,
  useDeleteMinistry,
} from "@/hooks/use-ministries";
import { useState } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MinisterioDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const { data: session } = useSession();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: ministry, isLoading, error } = useMinistry(id);
  const deleteMinistry = useDeleteMinistry();

  const isAdmin = session?.user?.role === "ADMIN";
  const isLeader =
    session?.user?.role === "LEADER" &&
    ministry?.leaderId === session?.user?.id;
  const canEdit = isAdmin || isLeader;

  const handleDelete = async () => {
    await deleteMinistry.mutateAsync(id);
    router.push("/ministerios");
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium text-foreground">
            Erro ao carregar ministerio
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O ministerio nao foi encontrado ou ocorreu um erro.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/ministerios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para ministerios
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Header */}
        <Card className="mb-8 border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <MemberListSkeleton />
        </div>
      </div>
    );
  }

  if (!ministry) {
    return null;
  }

  const activeMembers = ministry.members.filter((m) => m.active);
  const inactiveMembers = ministry.members.filter((m) => !m.active);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href="/ministerios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para ministerios
          </Link>
        </Button>
      </div>

      {/* Header Card */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {ministry.name}
              </CardTitle>
              {ministry.description && (
                <p className="mt-2 text-muted-foreground">{ministry.description}</p>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <EditMinistryDialog
                  ministry={ministry}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  }
                />
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Lider:</p>
            {ministry.leader ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ministry.leader.image || undefined} />
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {ministry.leader.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {ministry.leader.name || ministry.leader.email}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground italic">
                Sem lider definido
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-card0">
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Membros
              <Badge variant="secondary" className="ml-1 bg-secondary text-muted-foreground">
                {activeMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="h-4 w-4" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Historico
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="positions" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Posicoes
              </TabsTrigger>
            )}
          </TabsList>
          {canEdit && (
            <AddMemberDialog
              ministryId={ministry.id}
              existingMembers={ministry.members}
            />
          )}
        </div>

        <TabsContent value="members" className="space-y-6">
          {/* Active Members */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">
                Membros Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MemberList members={activeMembers} canEdit={canEdit} ministryId={ministry.id} />
            </CardContent>
          </Card>

          {/* Inactive Members */}
          {inactiveMembers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground">
                  Membros Inativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={inactiveMembers} canEdit={canEdit} ministryId={ministry.id} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedules">
          <Card className="border-border">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Escalas
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  As escalas deste ministerio serao exibidas aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-border">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <History className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Historico
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  O historico de atividades sera exibido aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canEdit && (
          <TabsContent value="positions">
            <PositionsManager ministryId={ministry.id} />
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ministerio</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o ministerio &quot;{ministry.name}
              &quot;? Esta acao ira remover todos os membros e escalas
              associadas. Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMinistry.isPending}
            >
              {deleteMinistry.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
