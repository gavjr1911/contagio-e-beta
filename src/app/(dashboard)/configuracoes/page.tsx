"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Mail,
  Save,
  Send,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useSettings,
  useUpdateSettings,
  useTestEmail,
  getSettingValue,
} from "@/hooks/use-settings";
import { SettingKey } from "@/lib/validations/settings";

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // Queries e mutations
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const testEmail = useTestEmail();

  // Estado local para os formularios
  const [emailSettings, setEmailSettings] = useState({
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
  });
  const [generalSettings, setGeneralSettings] = useState({
    APP_NAME: "",
  });
  const [testEmailTo, setTestEmailTo] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Verificar se e admin
  const isAdmin = session?.user?.role === "ADMIN";

  // Redirecionar se nao for admin
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/");
    }
  }, [status, isAdmin, router]);

  // Preencher formularios com dados do servidor
  useEffect(() => {
    if (settings) {
      setEmailSettings({
        RESEND_API_KEY: "", // Nao preencher API key por seguranca
        RESEND_FROM_EMAIL: getSettingValue(settings, "RESEND_FROM_EMAIL"),
      });
      setGeneralSettings({
        APP_NAME: getSettingValue(settings, "APP_NAME"),
      });
    }
  }, [settings]);

  // Handlers
  const handleSaveEmailSettings = async () => {
    const settingsToUpdate: { key: SettingKey; value: string }[] = [];

    if (emailSettings.RESEND_API_KEY) {
      settingsToUpdate.push({
        key: "RESEND_API_KEY",
        value: emailSettings.RESEND_API_KEY,
      });
    }

    if (emailSettings.RESEND_FROM_EMAIL) {
      settingsToUpdate.push({
        key: "RESEND_FROM_EMAIL",
        value: emailSettings.RESEND_FROM_EMAIL,
      });
    }

    if (settingsToUpdate.length === 0) {
      toast({
        title: "Nenhuma alteracao",
        description: "Preencha pelo menos um campo para salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSettings.mutateAsync({ settings: settingsToUpdate });
      toast({
        title: "Configuracoes salvas",
        description: "As configuracoes de email foram atualizadas com sucesso.",
      });
      // Limpar campo de API key apos salvar
      setEmailSettings((prev) => ({ ...prev, RESEND_API_KEY: "" }));
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (!generalSettings.APP_NAME) {
      toast({
        title: "Campo obrigatorio",
        description: "O nome da aplicacao e obrigatorio.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSettings.mutateAsync({
        settings: [
          {
            key: "APP_NAME",
            value: generalSettings.APP_NAME,
          },
        ],
      });
      toast({
        title: "Configuracoes salvas",
        description: "As configuracoes gerais foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) {
      toast({
        title: "Email obrigatorio",
        description: "Informe um email para enviar o teste.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await testEmail.mutateAsync({ to: testEmailTo });
      toast({
        title: "Email enviado",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Nao autorizado
  if (!isAdmin) {
    return null;
  }

  // Erro ao carregar
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Erro ao carregar configuracoes
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
      </div>
    );
  }

  // Obter valor atual da API key (mascarado) para exibir placeholder
  const currentApiKey = getSettingValue(settings, "RESEND_API_KEY");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuracoes</h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie as configuracoes do sistema
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card de Configuracoes de Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Configuracoes de Email</CardTitle>
            </div>
            <CardDescription>
              Configure a integracao com o Resend para envio de emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Chave da API do Resend</Label>
              <div className="relative">
                <Input
                  id="resend-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder={currentApiKey ? "****" + currentApiKey.slice(-4) : "re_xxxxxxxx..."}
                  value={emailSettings.RESEND_API_KEY}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      RESEND_API_KEY: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentApiKey
                  ? "Uma chave ja esta configurada. Preencha apenas se quiser alterar."
                  : "Obtenha sua chave em resend.com/api-keys"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-from-email">Email de Envio</Label>
              <Input
                id="resend-from-email"
                type="email"
                placeholder="Nome <email@seudominio.com>"
                value={emailSettings.RESEND_FROM_EMAIL}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    RESEND_FROM_EMAIL: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Formato: Nome &lt;email@seudominio.com&gt;
              </p>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="test-email">Testar Envio de Email</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testEmail.isPending}
                >
                  {testEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Testar</span>
                </Button>
              </div>
              {testEmail.isSuccess && (
                <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Email de teste enviado com sucesso!
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveEmailSettings}
              disabled={updateSettings.isPending}
              className="w-full"
            >
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configuracoes de Email
            </Button>
          </CardFooter>
        </Card>

        {/* Card de Configuracoes Gerais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Configuracoes Gerais</CardTitle>
            </div>
            <CardDescription>
              Configuracoes gerais da aplicacao
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Nome da Aplicacao</Label>
              <Input
                id="app-name"
                type="text"
                placeholder="Beta Church"
                value={generalSettings.APP_NAME}
                onChange={(e) =>
                  setGeneralSettings((prev) => ({
                    ...prev,
                    APP_NAME: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Este nome sera exibido nos emails e na interface
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveGeneralSettings}
              disabled={updateSettings.isPending}
              className="w-full"
            >
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configuracoes Gerais
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
