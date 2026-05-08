"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useSettings } from "@/hooks/use-settings";
import { EmailSettings } from "@/components/settings/email-settings";
import { GeneralSettings } from "@/components/settings/general-settings";
import { StorageSettings } from "@/components/settings/storage-settings";
import { ProPresenterSettings } from "@/components/settings/propresenter-settings";

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isLoading, error } = useSettings();

  const isAdmin = session?.user?.role === "ADMIN";

  // Redirecionar se não for admin
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/");
    }
  }, [status, isAdmin, router]);

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Não autorizado
  if (!isAdmin) {
    return null;
  }

  // Erro ao carregar
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Erro ao carregar configurações
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Configurações"
        description="Gerencie as configurações do sistema"
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <EmailSettings />
        <GeneralSettings />
        <StorageSettings />
        <ProPresenterSettings />
      </div>
    </div>
  );
}
