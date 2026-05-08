"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Church, Loader2, User, Mail, Phone, Calendar, CreditCard, Crown, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCreateMinistry,
  useUsers,
  useInviteMember,
} from "@/hooks/use-ministries";
import { formatCPF, formatPhone } from "@/lib/validations/user";
import { PermissionMatrixEditor } from "@/components/permissions/permission-matrix-editor";
import { DEFAULT_MINISTRY_PERMISSIONS } from "@/lib/permissions/defaults";
import type { MinistryPermissions } from "@/lib/permissions/types";

export default function NovoMinisterioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderTab, setLeaderTab] = useState<"existing" | "new">("existing");
  const [leaderId, setLeaderId] = useState<string>("");

  // Estados para criar novo líder
  const [newLeader, setNewLeader] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    birthDate: "",
  });
  const [permissions, setPermissions] = useState<MinistryPermissions>(DEFAULT_MINISTRY_PERMISSIONS);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const createMinistry = useCreateMinistry();
  const inviteMember = useInviteMember();

  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect if not admin
  if (status === "authenticated" && !isAdmin) {
    router.push("/ministerios");
    return null;
  }

  const validateNewLeader = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newLeader.name || newLeader.name.length < 2) {
      errors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!newLeader.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newLeader.email)) {
      errors.email = "Email inválido";
    }

    if (!newLeader.cpf || newLeader.cpf.replace(/\D/g, "").length !== 11) {
      errors.cpf = "CPF inválido";
    }

    const phoneDigits = newLeader.phone.replace(/\D/g, "");
    if (!newLeader.phone || phoneDigits.length < 10) {
      errors.phone = "Telefone obrigatório";
    } else if (phoneDigits.length > 11) {
      errors.phone = "Telefone inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCPFChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const formatted = formatCPF(digits);
    setNewLeader((prev) => ({ ...prev, cpf: formatted }));
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const formatted = digits.length > 0 ? formatPhone(digits) : "";
    setNewLeader((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    let finalLeaderId: string | undefined;

    // Se estiver na aba de novo líder e tiver dados preenchidos
    if (leaderTab === "new" && newLeader.name && newLeader.email) {
      if (!validateNewLeader()) return;

      try {
        // Primeiro cria o ministério sem líder
        const ministry = await createMinistry.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: permissions as unknown as Record<string, Record<string, string>>,
        });

        // Depois convida o usuário e adiciona como membro
        const result = await inviteMember.mutateAsync({
          name: newLeader.name,
          email: newLeader.email,
          cpf: newLeader.cpf,
          phone: newLeader.phone || undefined,
          birthDate: newLeader.birthDate || undefined,
          ministryId: ministry.id,
        });

        // Atualiza o ministério com o líder
        await fetch(`/api/ministries/${ministry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderId: result.user.id }),
        });

        router.push(`/ministerios/${ministry.id}`);
        return;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("email")) {
            setFormErrors({ email: "Este email já está cadastrado" });
          } else if (error.message.includes("CPF")) {
            setFormErrors({ cpf: "Este CPF já está cadastrado" });
          } else {
            setFormErrors({ general: error.message });
          }
        }
        return;
      }
    }

    // Líder existente selecionado
    if (leaderId && leaderId !== "none") {
      finalLeaderId = leaderId;
    }

    const ministry = await createMinistry.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      leaderId: finalLeaderId,
      permissions: permissions as unknown as Record<string, Record<string, string>>,
    });

    router.push(`/ministerios/${ministry.id}`);
  };

  if (status === "loading") {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="border-border">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <PageHeader
        backHref="/ministerios"
        backLabel="Voltar para ministérios"
        icon={Church}
        title="Novo Ministério"
        description="Preencha as informações para criar um novo ministério"
      />

      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nome do ministério <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ministério de Louvor"
                required
                className="border-border focus:border-primary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Descrição
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito e atividades deste ministério..."
                rows={4}
                className="border-border focus:border-primary"
              />
            </div>

            {/* Leader */}
            <div className="space-y-3">
              <Label className="text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Líder do ministério
              </Label>

              <Tabs value={leaderTab} onValueChange={(v) => setLeaderTab(v as "existing" | "new")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" className="gap-2 whitespace-nowrap">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Selecionar Existente</span>
                    <span className="sm:hidden">Existente</span>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-2 whitespace-nowrap">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Criar Novo</span>
                    <span className="sm:hidden">Novo</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Selecionar Usuario Existente */}
                <TabsContent value="existing" className="mt-4">
                  {isLoadingUsers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={leaderId} onValueChange={setLeaderId}>
                      <SelectTrigger className="border-border focus:border-primary">
                        <SelectValue placeholder="Selecione um líder (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Sem líder</span>
                        </SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary text-white">
                                  {user.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.name || user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TabsContent>

                {/* Tab: Criar Novo Usuario */}
                <TabsContent value="new" className="mt-4 space-y-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="leaderName">Nome *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="leaderName"
                        value={newLeader.name}
                        onChange={(e) =>
                          setNewLeader((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Nome completo"
                        className="pl-10"
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-sm text-destructive">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="leaderEmail">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="leaderEmail"
                        type="email"
                        value={newLeader.email}
                        onChange={(e) =>
                          setNewLeader((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="email@exemplo.com"
                        className="pl-10"
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-sm text-destructive">{formErrors.email}</p>
                    )}
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <Label htmlFor="leaderCPF">CPF *</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="leaderCPF"
                        value={newLeader.cpf}
                        onChange={(e) => handleCPFChange(e.target.value)}
                        placeholder="000.000.000-00"
                        className="pl-10"
                      />
                    </div>
                    {formErrors.cpf && (
                      <p className="text-sm text-destructive">{formErrors.cpf}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="leaderPhone">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="leaderPhone"
                        value={newLeader.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="pl-10"
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-sm text-destructive">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-2">
                    <Label htmlFor="leaderBirthDate">Data de Nascimento (opcional)</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="leaderBirthDate"
                        type="date"
                        value={newLeader.birthDate}
                        onChange={(e) =>
                          setNewLeader((prev) => ({ ...prev, birthDate: e.target.value }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Erro Geral */}
                  {formErrors.general && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                      <p className="text-sm text-destructive text-center">
                        {formErrors.general}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                    Um email de convite será enviado para o líder definir sua senha e acessar o sistema.
                  </div>
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground">
                O líder terá permissões para gerenciar membros e escalas
              </p>
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-3">
              <Label className="text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Permissões do ministério
              </Label>
              <p className="text-xs text-muted-foreground">
                Configure o que o líder e os membros deste ministério podem acessar no sistema.
              </p>
              <PermissionMatrixEditor
                value={permissions}
                onChange={setPermissions}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/ministerios">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createMinistry.isPending || inviteMember.isPending}
                className="w-full sm:w-auto"
              >
                {createMinistry.isPending || inviteMember.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Ministério"
                )}
              </Button>
            </div>

            {/* Error message */}
            {createMinistry.error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {createMinistry.error.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
