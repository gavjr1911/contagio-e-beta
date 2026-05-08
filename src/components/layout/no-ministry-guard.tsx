"use client";

import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import { ShieldAlert, Loader2 } from "lucide-react";

interface NoMinistryGuardProps {
  children: React.ReactNode;
}

export function NoMinistryGuard({ children }: NoMinistryGuardProps) {
  const { data: session, status } = useSession();
  const { isAdmin, hasMinistry, isLoading } = usePermissions();

  // Enquanto carrega, não bloqueia
  if (status === "loading" || isLoading) {
    return <>{children}</>;
  }

  // Admin sempre passa
  if (isAdmin) {
    return <>{children}</>;
  }

  // Usuário sem ministério — mostrar tela de bloqueio
  if (!hasMinistry) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Acesso pendente
          </h2>
          <p className="text-muted-foreground">
            Você ainda não está vinculado a nenhum ministério.
            Entre em contato com o administrador do sistema para ser
            adicionado a um ministério e receber as permissões de acesso.
          </p>
          {session?.user?.email && (
            <p className="text-sm text-muted-foreground/70">
              Logado como {session.user.email}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
