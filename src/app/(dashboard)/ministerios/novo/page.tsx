"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Church, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateMinistry,
  useUsers,
  getMinistryTypeLabel,
  ministryTypeLabels,
} from "@/hooks/use-ministries";
import { MinistryType } from "@/generated/prisma/enums";

export default function NovoMinisterioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MinistryType | "">("");
  const [leaderId, setLeaderId] = useState<string>("");

  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const createMinistry = useCreateMinistry();

  const isAdmin = session?.user?.role === "ADMIN";
  const ministryTypes = Object.keys(ministryTypeLabels) as MinistryType[];

  // Redirect if not admin
  if (status === "authenticated" && !isAdmin) {
    router.push("/ministerios");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !type) return;

    const ministry = await createMinistry.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      type: type as MinistryType,
      leaderId: leaderId || undefined,
    });

    router.push(`/ministerios/${ministry.id}`);
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="border-beta-navy/20">
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
        <Button asChild variant="ghost" className="text-beta-navy hover:text-beta-black">
          <Link href="/ministerios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para ministerios
          </Link>
        </Button>
      </div>

      <Card className="border-beta-navy/20 bg-beta-cream/5">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beta-terracotta/10">
              <Church className="h-5 w-5 text-beta-terracotta" />
            </div>
            <CardTitle className="text-2xl font-bold text-beta-black">
              Novo Ministerio
            </CardTitle>
          </div>
          <p className="text-sm text-beta-navy/70 pl-13">
            Preencha as informacoes para criar um novo ministerio
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-beta-black">
                Nome do ministerio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ministerio de Louvor"
                required
                className="border-beta-navy/20 focus:border-beta-terracotta"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-beta-black">
                Descricao
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o proposito e atividades deste ministerio..."
                rows={4}
                className="border-beta-navy/20 focus:border-beta-terracotta"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-beta-black">
                Tipo de ministerio <span className="text-red-500">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as MinistryType)}
              >
                <SelectTrigger
                  id="type"
                  className="border-beta-navy/20 focus:border-beta-terracotta"
                >
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ministryTypes.map((ministryType) => (
                    <SelectItem key={ministryType} value={ministryType}>
                      {getMinistryTypeLabel(ministryType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leader */}
            <div className="space-y-2">
              <Label htmlFor="leader" className="text-beta-black">
                Lider
              </Label>
              {isLoadingUsers ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={leaderId} onValueChange={setLeaderId}>
                  <SelectTrigger
                    id="leader"
                    className="border-beta-navy/20 focus:border-beta-terracotta"
                  >
                    <SelectValue placeholder="Selecione um lider (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem lider</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-beta-navy/60">
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
                disabled={!name.trim() || !type || createMinistry.isPending}
                className="bg-beta-terracotta hover:bg-beta-terracotta/90"
              >
                {createMinistry.isPending ? (
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
