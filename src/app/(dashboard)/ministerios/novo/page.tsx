"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Church, Loader2, User, Mail, Phone, Calendar, CreditCard, Crown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function NovoMinisterioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderTab, setLeaderTab] = useState<"existing" | "new">("existing");
  const [leaderId, setLeaderId] = useState<string>("");

  // Estados para criar novo lider
  const [newLeader, setNewLeader] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    birthDate: "",
  });
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
      errors.email = "Email invalido";
    }

    if (!newLeader.cpf || newLeader.cpf.replace(/\D/g, "").length !== 11) {
      errors.cpf = "CPF invalido";
    }

    const phoneDigits = newLeader.phone.replace(/\D/g, "");
    if (!newLeader.phone || phoneDigits.length < 10) {
      errors.phone = "Telefone obrigatorio";
    } else if (phoneDigits.length > 11) {
      errors.phone = "Telefone invalido";
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

    // Se estiver na aba de novo lider e tiver dados preenchidos
    if (leaderTab === "new" && newLeader.name && newLeader.email) {
      if (!validateNewLeader()) return;

      try {
        // Primeiro cria o ministerio sem lider
        const ministry = await createMinistry.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });

        // Depois convida o usuario e adiciona como membro
        const result = await inviteMember.mutateAsync({
          name: newLeader.name,
          email: newLeader.email,
          cpf: newLeader.cpf,
          phone: newLeader.phone || undefined,
          birthDate: newLeader.birthDate || undefined,
          ministryId: ministry.id,
          position: "Lider",
        });

        // Atualiza o ministerio com o lider
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
            setFormErrors({ email: "Este email ja esta cadastrado" });
          } else if (error.message.includes("CPF")) {
            setFormErrors({ cpf: "Este CPF ja esta cadastrado" });
          } else {
            setFormErrors({ general: error.message });
          }
        }
        return;
      }
    }

    // Lider existente selecionado
    if (leaderId && leaderId !== "none") {
      finalLeaderId = leaderId;
    }

    const ministry = await createMinistry.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      leaderId: finalLeaderId,
    });

    router.push(`/ministerios/${ministry.id}`);
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href="/ministerios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para ministerios
          </Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Church className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Novo Ministerio
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground pl-13">
            Preencha as informacoes para criar um novo ministerio
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nome do ministerio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ministerio de Louvor"
                required
                className="border-border focus:border-primary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Descricao
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o proposito e atividades deste ministerio..."
                rows={4}
                className="border-border focus:border-primary"
              />
            </div>

            {/* Leader */}
            <div className="space-y-3">
              <Label className="text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Lider do ministerio
              </Label>

              <Tabs value={leaderTab} onValueChange={(v) => setLeaderTab(v as "existing" | "new")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" className="gap-2">
                    <User className="h-4 w-4" />
                    Selecionar Existente
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Criar Novo
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Selecionar Usuario Existente */}
                <TabsContent value="existing" className="mt-4">
                  {isLoadingUsers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={leaderId} onValueChange={setLeaderId}>
                      <SelectTrigger className="border-border focus:border-primary">
                        <SelectValue placeholder="Selecione um lider (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Sem lider</span>
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
                    Um email de convite sera enviado para o lider definir sua senha e acessar o sistema.
                  </div>
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground">
                O lider tera permissoes para gerenciar membros e escalas
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/ministerios">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createMinistry.isPending || inviteMember.isPending}
                className="bg-primary hover:bg-primary-hover"
              >
                {createMinistry.isPending || inviteMember.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Ministerio"
                )}
              </Button>
            </div>

            {/* Error message */}
            {createMinistry.error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {createMinistry.error.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
