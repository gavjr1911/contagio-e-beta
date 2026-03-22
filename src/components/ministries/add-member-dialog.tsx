"use client";

import { useState } from "react";
import { UserPlus, Loader2, Mail, User, Phone, Calendar, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddMember,
  useInviteMember,
  useUsers,
  useMinistryPositions,
  MinistryMember,
} from "@/hooks/use-ministries";
import { formatCPF, formatPhone } from "@/lib/validations/user";

interface AddMemberDialogProps {
  ministryId: string;
  existingMembers: MinistryMember[];
}

export function AddMemberDialog({
  ministryId,
  existingMembers,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");

  // Estados para selecionar usuario existente
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);

  // Estados para criar novo usuario
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    birthDate: "",
  });
  const [newUserPositionIds, setNewUserPositionIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: positions } = useMinistryPositions(ministryId);
  const addMember = useAddMember();
  const inviteMember = useInviteMember();

  // Filter out users who are already members
  const existingMemberIds = existingMembers.map((m) => m.userId);
  const availableUsers = users?.filter(
    (user) => !existingMemberIds.includes(user.id)
  );

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPositionIds([]);
    setNewUser({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      birthDate: "",
    });
    setNewUserPositionIds([]);
    setFormErrors({});
    setActiveTab("existing");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const togglePosition = (positionId: string, isNewUser: boolean) => {
    if (isNewUser) {
      setNewUserPositionIds((prev) =>
        prev.includes(positionId)
          ? prev.filter((id) => id !== positionId)
          : [...prev, positionId]
      );
    } else {
      setSelectedPositionIds((prev) =>
        prev.includes(positionId)
          ? prev.filter((id) => id !== positionId)
          : [...prev, positionId]
      );
    }
  };

  const handleAddExisting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) return;

    await addMember.mutateAsync({
      ministryId,
      userId: selectedUserId,
      positionIds: selectedPositionIds.length > 0 ? selectedPositionIds : undefined,
    });

    handleOpenChange(false);
  };

  const validateNewUser = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newUser.name || newUser.name.length < 2) {
      errors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!newUser.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      errors.email = "Email invalido";
    }

    if (!newUser.cpf || newUser.cpf.replace(/\D/g, "").length !== 11) {
      errors.cpf = "CPF invalido";
    }

    const phoneDigits = newUser.phone.replace(/\D/g, "");
    if (!newUser.phone || phoneDigits.length < 10) {
      errors.phone = "Telefone obrigatorio";
    } else if (phoneDigits.length > 11) {
      errors.phone = "Telefone invalido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteNew = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateNewUser()) return;

    try {
      await inviteMember.mutateAsync({
        name: newUser.name,
        email: newUser.email,
        cpf: newUser.cpf,
        phone: newUser.phone || undefined,
        birthDate: newUser.birthDate || undefined,
        ministryId,
        positionIds: newUserPositionIds.length > 0 ? newUserPositionIds : undefined,
      });

      handleOpenChange(false);
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
    }
  };

  const handleCPFChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const formatted = formatCPF(digits);
    setNewUser((prev) => ({ ...prev, cpf: formatted }));
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const formatted = digits.length > 0 ? formatPhone(digits) : "";
    setNewUser((prev) => ({ ...prev, phone: formatted }));
  };

  const PositionSelector = ({ isNewUser }: { isNewUser: boolean }) => {
    const currentPositionIds = isNewUser ? newUserPositionIds : selectedPositionIds;

    if (!positions || positions.length === 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Nenhuma funcao cadastrada para este ministerio.
          </p>
          <p className="text-xs text-muted-foreground">
            Cadastre funcoes na aba "Funcoes" para seleciona-las aqui.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="grid gap-2">
          {positions.map((pos) => (
            <div
              key={pos.id}
              className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer"
              onClick={() => togglePosition(pos.id, isNewUser)}
            >
              <Checkbox
                id={`pos-${pos.id}-${isNewUser ? "new" : "existing"}`}
                checked={currentPositionIds.includes(pos.id)}
                onCheckedChange={() => togglePosition(pos.id, isNewUser)}
              />
              <div className="flex-1">
                <label
                  htmlFor={`pos-${pos.id}-${isNewUser ? "new" : "existing"}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {pos.name}
                </label>
                {pos.description && (
                  <p className="text-xs text-muted-foreground">{pos.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {currentPositionIds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {currentPositionIds.length} funcao(oes) selecionada(s)
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
          <DialogDescription>
            Selecione um usuario existente ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "new")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Selecionar Existente</TabsTrigger>
            <TabsTrigger value="new">Criar Novo</TabsTrigger>
          </TabsList>

          {/* Tab: Selecionar Usuario Existente */}
          <TabsContent value="existing">
            <form onSubmit={handleAddExisting}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Usuario</Label>
                  {isLoadingUsers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : availableUsers && availableUsers.length > 0 ? (
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Selecione um usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Todos os usuarios ja sao membros deste ministerio.
                    </p>
                  )}
                </div>

                {/* Posicoes - para usuario existente */}
                <div className="space-y-2">
                  <Label>Funcoes no ministerio</Label>
                  <PositionSelector isNewUser={false} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !selectedUserId ||
                    addMember.isPending ||
                    !availableUsers?.length
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {addMember.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Tab: Criar Novo Usuario */}
          <TabsContent value="new">
            <form onSubmit={handleInviteNew}>
              <div className="space-y-4 py-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="newName">Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newName"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser((prev) => ({ ...prev, name: e.target.value }))
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
                  <Label htmlFor="newEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newEmail"
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser((prev) => ({ ...prev, email: e.target.value }))
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
                  <Label htmlFor="newCPF">CPF *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newCPF"
                      value={newUser.cpf}
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
                  <Label htmlFor="newPhone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPhone"
                      value={newUser.phone}
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
                  <Label htmlFor="newBirthDate">Data de Nascimento (opcional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newBirthDate"
                      type="date"
                      value={newUser.birthDate}
                      onChange={(e) =>
                        setNewUser((prev) => ({ ...prev, birthDate: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Posicoes - para novo usuario */}
                <div className="space-y-2">
                  <Label>Funcoes no ministerio</Label>
                  <PositionSelector isNewUser={true} />
                </div>

                {/* Erro Geral */}
                {formErrors.general && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                    <p className="text-sm text-destructive text-center">
                      {formErrors.general}
                    </p>
                  </div>
                )}

                {/* Info sobre convite */}
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  Um email de convite sera enviado para o usuario definir sua senha e acessar o sistema.
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMember.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {inviteMember.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Convidando...
                    </>
                  ) : (
                    "Convidar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
