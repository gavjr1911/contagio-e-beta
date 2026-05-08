"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, Crown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useUpdateMinistry,
  useUsers,
  Ministry,
  MinistryMember,
} from "@/hooks/use-ministries";

interface EditMinistryDialogProps {
  ministry: Ministry;
  trigger?: React.ReactNode;
}

export function EditMinistryDialog({ ministry, trigger }: EditMinistryDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(ministry.name);
  const [description, setDescription] = useState(ministry.description || "");
  const [leaderId, setLeaderId] = useState(ministry.leaderId || "none");

  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const updateMinistry = useUpdateMinistry();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(ministry.name);
      setDescription(ministry.description || "");
      setLeaderId(ministry.leaderId || "none");
    }
  }, [open, ministry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await updateMinistry.mutateAsync({
      id: ministry.id,
      name: name.trim(),
      description: description.trim() || undefined,
      leaderId: leaderId && leaderId !== "none" ? leaderId : undefined,
    });

    setOpen(false);
  };

  // Get members who could be leaders (prioritize current members)
  const memberIds = ministry.members?.map((m: MinistryMember) => m.userId) || [];
  const membersAsUsers = users?.filter((u) => memberIds.includes(u.id)) || [];
  const otherUsers = users?.filter((u) => !memberIds.includes(u.id)) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar ministério</DialogTitle>
          <DialogDescription>
            Altere as informações do ministério e defina o líder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Nome do ministério <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ministério de Louvor"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito e atividades deste ministério..."
                rows={3}
              />
            </div>

            {/* Leader */}
            <div className="space-y-2">
              <Label htmlFor="edit-leader" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Líder do ministério
              </Label>
              {isLoadingUsers ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={leaderId} onValueChange={setLeaderId}>
                  <SelectTrigger id="edit-leader">
                    <SelectValue placeholder="Selecione um líder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Sem líder</span>
                    </SelectItem>

                    {/* Members first */}
                    {membersAsUsers.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Membros do ministério
                        </div>
                        {membersAsUsers.map((user) => (
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
                              {user.id === ministry.leaderId && (
                                <Crown className="h-3 w-3 text-primary ml-1" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}

                    {/* Other users */}
                    {otherUsers.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Outros usuários
                        </div>
                        {otherUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="text-[10px] bg-secondary text-muted-foreground">
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
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                O líder terá permissões para gerenciar membros e escalas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updateMinistry.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateMinistry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
