"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Save,
  Send,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
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

export function EmailSettings() {
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const testEmail = useTestEmail();

  const [emailSettings, setEmailSettings] = useState({
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
  });
  const [testEmailTo, setTestEmailTo] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailSettings({
        RESEND_API_KEY: "",
        RESEND_FROM_EMAIL: getSettingValue(settings, "RESEND_FROM_EMAIL"),
      });
    }
  }, [settings]);

  const currentApiKey = getSettingValue(settings, "RESEND_API_KEY");

  const handleSave = async () => {
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
        title: "Nenhuma alteração",
        description: "Preencha pelo menos um campo para salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSettings.mutateAsync({ settings: settingsToUpdate });
      toast({
        title: "Configurações salvas",
        description: "As configurações de email foram atualizadas com sucesso.",
      });
      setEmailSettings((prev) => ({ ...prev, RESEND_API_KEY: "" }));
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
        title: "Email obrigatório",
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Configurações de Email</CardTitle>
        </div>
        <CardDescription>
          Configure a integração com o Resend para envio de emails
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
              ? "Uma chave já está configurada. Preencha apenas se quiser alterar."
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
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="w-full"
        >
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Configurações de Email
        </Button>
      </CardFooter>
    </Card>
  );
}
