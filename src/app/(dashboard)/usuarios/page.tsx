"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserCog,
  Search,
  Shield,
  ShieldCheck,
  User,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useManagedUsers,
  useUpdateUser,
  useToggleUserActive,
  useSendUserAccessLink,
  useGenerateTempPassword,
  type ManagedUser,
} from "@/hooks/use-user-management";
import { useMinistries } from "@/hooks/use-ministries";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  LEADER: "Líder",
  VOLUNTEER: "Voluntário",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
  LEADER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  VOLUNTEER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [ministryFilter, setMinistryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Edit dialog
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect if not admin
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/");
    }
  }, [status, isAdmin, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter, ministryFilter]);

  const { data, isLoading } = useManagedUsers({
    search: debouncedSearch || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    active: activeFilter !== "all" ? activeFilter : undefined,
    ministryId: ministryFilter !== "all" ? ministryFilter : undefined,
    page,
    limit: 20,
  });

  const { data: ministriesData } = useMinistries();
  const updateUser = useUpdateUser();
  const toggleActive = useToggleUserActive();
  const sendAccessLink = useSendUserAccessLink();
  const generateTempPassword = useGenerateTempPassword();

  // Diálogo de resultado da senha temporária
  const [tempPasswordResult, setTempPasswordResult] = useState<
    { name: string; email: string; tempPassword: string } | null
  >(null);
  const [copied, setCopied] = useState(false);
  // Guarda o id do usuário em ação para desabilitar o item durante a chamada
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null);

  const ministries = ministriesData || [];

  const handleEdit = (user: ManagedUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
      });
      setEditUser(null);
      toast({ title: "Usuário atualizado" });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar",
        variant: "destructive",
      });
    }
  };

  const handleSendAccessLink = async (user: ManagedUser) => {
    setPendingActionUserId(user.id);
    try {
      const res = await sendAccessLink.mutateAsync(user.id);
      toast({
        title: "Link de acesso enviado",
        description: res.email,
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar link",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setPendingActionUserId(null);
    }
  };

  const handleGenerateTempPassword = async (user: ManagedUser) => {
    setPendingActionUserId(user.id);
    try {
      const res = await generateTempPassword.mutateAsync(user.id);
      setCopied(false);
      setTempPasswordResult({
        name: user.name || user.email,
        email: res.email,
        tempPassword: res.tempPassword,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar senha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setPendingActionUserId(null);
    }
  };

  const handleCopyTempPassword = async () => {
    if (!tempPasswordResult) return;
    try {
      await navigator.clipboard.writeText(tempPasswordResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível — o usuário pode copiar manualmente */
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      await toggleActive.mutateAsync({
        id: user.id,
        active: !user.active,
      });
      toast({
        title: user.active ? "Usuário desativado" : "Usuário ativado",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const users = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={UserCog}
        iconClassName="bg-primary/10"
        title="Usuários"
        description="Gerencie os usuários do sistema"
        actions={
          pagination && (
            <Badge variant="secondary">{pagination.total} usuários</Badge>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LEADER">Líder</SelectItem>
                <SelectItem value="VOLUNTEER">Voluntário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ministryFilter} onValueChange={setMinistryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Ministério" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ministérios</SelectItem>
                {ministries.map((m: { id: string; name: string }) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-foreground font-medium">
                Nenhum usuário encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros de busca
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors",
                    !user.active && "opacity-60"
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {user.name || "Sem nome"}
                      </p>
                      {!user.active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Ministries */}
                  <div className="hidden md:flex items-center gap-1 max-w-[200px]">
                    {user.ministryMemberships.length > 0 ? (
                      user.ministryMemberships.slice(0, 2).map((m) => (
                        <Badge
                          key={m.id}
                          variant="secondary"
                          className="text-xs truncate max-w-[90px]"
                        >
                          {m.ministry.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sem ministério
                      </span>
                    )}
                    {user.ministryMemberships.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{user.ministryMemberships.length - 2}
                      </Badge>
                    )}
                  </div>

                  {/* Role */}
                  <Badge
                    variant="outline"
                    className={cn("text-xs", ROLE_COLORS[user.role])}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do usuário">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSendAccessLink(user)}
                        disabled={pendingActionUserId === user.id}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Reenviar link de acesso
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleGenerateTempPassword(user)}
                        disabled={pendingActionUserId === user.id}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Gerar senha temporária
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.id !== session?.user?.id && (
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user)}
                          className={
                            user.active
                              ? "text-destructive focus:text-destructive"
                              : "text-emerald-500 focus:text-emerald-500"
                          }
                        >
                          {user.active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="LEADER">Líder</SelectItem>
                  <SelectItem value="VOLUNTEER">Voluntário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ministries info (read-only) */}
            {editUser && editUser.ministryMemberships.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ministérios</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editUser.ministryMemberships.map((m) => (
                    <Badge key={m.id} variant="secondary" className="text-xs">
                      {m.ministry.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Senha temporária gerada */}
      <Dialog
        open={!!tempPasswordResult}
        onOpenChange={(open) => !open && setTempPasswordResult(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporária gerada</DialogTitle>
            <DialogDescription>
              Copie e envie esta senha para{" "}
              <strong>{tempPasswordResult?.name}</strong> ({tempPasswordResult?.email}).
              Ela <strong>não será exibida novamente</strong> — oriente a pessoa a
              trocá-la após entrar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-lg tracking-wider text-foreground select-all">
              {tempPasswordResult?.tempPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleCopyTempPassword}
              aria-label="Copiar senha"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setTempPasswordResult(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
