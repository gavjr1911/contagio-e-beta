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
  Shield,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
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
import { PermissionMatrixEditor } from "@/components/permissions/permission-matrix-editor";
import { DEFAULT_MINISTRY_PERMISSIONS } from "@/lib/permissions/defaults";
import { normalizeMinistryPermissions } from "@/lib/permissions/normalize";
import type { MinistryPermissions } from "@/lib/permissions/types";
import { useUpdateMinistry } from "@/hooks/use-ministries";
import { toast } from "@/hooks/use-toast";
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
  const updateMinistry = useUpdateMinistry();
  const [activeTab, setActiveTab] = useState("members");
  const [permissionsState, setPermissionsState] = useState<MinistryPermissions | null>(null);
  const [permissionsDirty, setPermissionsDirty] = useState(false);

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
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium text-foreground">
            Erro ao carregar ministério
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O ministério não foi encontrado ou ocorreu um erro.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/ministerios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para ministérios
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/ministerios"
        backLabel="Voltar para ministérios"
        title={ministry.name}
        description={ministry.description || undefined}
        actions={
          canEdit && (
            <>
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
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              )}
            </>
          )
        }
      />

      {/* Leader Card */}
      <Card className="border-border bg-card">
        <CardHeader className="sr-only">
          <CardTitle>Líder</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Líder:</p>
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
                Sem líder definido
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="overflow-x-auto no-scrollbar max-w-full justify-start">
            <TabsTrigger value="members" className="gap-2 whitespace-nowrap">
              <Users className="h-4 w-4" />
              Membros
              <Badge variant="secondary" className="ml-1 bg-secondary text-muted-foreground">
                {activeMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 whitespace-nowrap">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="positions" className="gap-2 whitespace-nowrap">
                <Briefcase className="h-4 w-4" />
                Funções
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="permissions" className="gap-2 whitespace-nowrap">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Permissões</span>
                <span className="sm:hidden">Perm.</span>
              </TabsTrigger>
            )}
          </TabsList>
          {canEdit && activeTab === "members" && (
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
              <MemberList members={activeMembers} canEdit={canEdit} ministryId={ministry.id} leaderId={ministry.leaderId ?? undefined} />
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
                <MemberList members={inactiveMembers} canEdit={canEdit} ministryId={ministry.id} leaderId={ministry.leaderId ?? undefined} />
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
                  As escalas deste ministério serão exibidas aqui.
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
                  Histórico
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  O histórico de atividades será exibido aqui.
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

        {isAdmin && (
          <TabsContent value="permissions">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Matriz de Permissões
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure o que o líder e os membros deste ministério podem acessar.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <PermissionMatrixEditor
                  value={
                    permissionsState ??
                    (ministry.permissions
                      ? normalizeMinistryPermissions(ministry.permissions)
                      : DEFAULT_MINISTRY_PERMISSIONS)
                  }
                  onChange={(value) => {
                    setPermissionsState(value);
                    setPermissionsDirty(true);
                  }}
                />
                {permissionsDirty && (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          await updateMinistry.mutateAsync({
                            id: ministry.id,
                            permissions: permissionsState ?? undefined,
                          });
                          setPermissionsDirty(false);
                          toast({
                            title: "Permissões salvas",
                            description: "As permissões do ministério foram atualizadas.",
                          });
                        } catch {
                          toast({
                            title: "Erro",
                            description: "Não foi possível salvar as permissões.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={updateMinistry.isPending}
                      className="w-full sm:w-auto"
                    >
                      {updateMinistry.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Permissões"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ministério</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o ministério &quot;{ministry.name}
              &quot;? Esta ação irá remover todos os membros e escalas
              associadas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
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
