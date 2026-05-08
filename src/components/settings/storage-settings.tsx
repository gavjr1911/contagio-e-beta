"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  TestTube,
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
  useTestR2,
  getSettingValue,
} from "@/hooks/use-settings";
import { SettingKey } from "@/lib/validations/settings";

export function StorageSettings() {
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const testR2 = useTestR2();

  const [r2Settings, setR2Settings] = useState({
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "",
    R2_PUBLIC_URL: "",
  });
  const [showR2Keys, setShowR2Keys] = useState(false);

  useEffect(() => {
    if (settings) {
      setR2Settings({
        R2_ACCOUNT_ID: getSettingValue(settings, "R2_ACCOUNT_ID"),
        R2_ACCESS_KEY_ID: "",
        R2_SECRET_ACCESS_KEY: "",
        R2_BUCKET_NAME: getSettingValue(settings, "R2_BUCKET_NAME"),
        R2_PUBLIC_URL: getSettingValue(settings, "R2_PUBLIC_URL"),
      });
    }
  }, [settings]);

  const currentR2AccessKey = getSettingValue(settings, "R2_ACCESS_KEY_ID");
  const currentR2SecretKey = getSettingValue(settings, "R2_SECRET_ACCESS_KEY");

  const handleSave = async () => {
    const settingsToUpdate: { key: SettingKey; value: string }[] = [];

    if (r2Settings.R2_ACCOUNT_ID) {
      settingsToUpdate.push({ key: "R2_ACCOUNT_ID", value: r2Settings.R2_ACCOUNT_ID });
    }
    if (r2Settings.R2_ACCESS_KEY_ID) {
      settingsToUpdate.push({ key: "R2_ACCESS_KEY_ID", value: r2Settings.R2_ACCESS_KEY_ID });
    }
    if (r2Settings.R2_SECRET_ACCESS_KEY) {
      settingsToUpdate.push({
        key: "R2_SECRET_ACCESS_KEY",
        value: r2Settings.R2_SECRET_ACCESS_KEY,
      });
    }
    if (r2Settings.R2_BUCKET_NAME) {
      settingsToUpdate.push({ key: "R2_BUCKET_NAME", value: r2Settings.R2_BUCKET_NAME });
    }
    if (r2Settings.R2_PUBLIC_URL) {
      settingsToUpdate.push({ key: "R2_PUBLIC_URL", value: r2Settings.R2_PUBLIC_URL });
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
        description: "As configurações do R2 foram atualizadas com sucesso.",
      });
      setR2Settings((prev) => ({
        ...prev,
        R2_ACCESS_KEY_ID: "",
        R2_SECRET_ACCESS_KEY: "",
      }));
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    try {
      const result = await testR2.mutateAsync();
      if (result.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: result.message,
        });
      } else {
        toast({
          title: "Falha na conexão",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao testar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="lg:col-span-2 xl:col-span-1">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <CardTitle>Armazenamento de Mídia</CardTitle>
        </div>
        <CardDescription>
          Configure o Cloudflare R2 para upload de arquivos de mídia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="r2-account-id">Account ID</Label>
          <Input
            id="r2-account-id"
            type="text"
            placeholder="Ex: a1b2c3d4e5f6..."
            value={r2Settings.R2_ACCOUNT_ID}
            onChange={(e) =>
              setR2Settings((prev) => ({ ...prev, R2_ACCOUNT_ID: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Encontre em cloudflare.com &gt; R2 &gt; Overview
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r2-access-key">Access Key ID</Label>
          <div className="relative">
            <Input
              id="r2-access-key"
              type={showR2Keys ? "text" : "password"}
              placeholder={
                currentR2AccessKey ? "****" + currentR2AccessKey.slice(-4) : "Access Key ID"
              }
              value={r2Settings.R2_ACCESS_KEY_ID}
              onChange={(e) =>
                setR2Settings((prev) => ({ ...prev, R2_ACCESS_KEY_ID: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() => setShowR2Keys(!showR2Keys)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showR2Keys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r2-secret-key">Secret Access Key</Label>
          <Input
            id="r2-secret-key"
            type={showR2Keys ? "text" : "password"}
            placeholder={
              currentR2SecretKey ? "****" + currentR2SecretKey.slice(-4) : "Secret Access Key"
            }
            value={r2Settings.R2_SECRET_ACCESS_KEY}
            onChange={(e) =>
              setR2Settings((prev) => ({
                ...prev,
                R2_SECRET_ACCESS_KEY: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            {currentR2SecretKey
              ? "Chaves já configuradas. Preencha apenas se quiser alterar."
              : "Crie um token API em R2 > Manage R2 API Tokens"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r2-bucket">Nome do Bucket</Label>
          <Input
            id="r2-bucket"
            type="text"
            placeholder="contagie-media"
            value={r2Settings.R2_BUCKET_NAME}
            onChange={(e) =>
              setR2Settings((prev) => ({ ...prev, R2_BUCKET_NAME: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="r2-public-url">URL Pública</Label>
          <Input
            id="r2-public-url"
            type="url"
            placeholder="https://pub-xxx.r2.dev"
            value={r2Settings.R2_PUBLIC_URL}
            onChange={(e) =>
              setR2Settings((prev) => ({ ...prev, R2_PUBLIC_URL: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Habilite acesso público no bucket ou configure um domínio
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Testar Conexão</p>
              <p className="text-xs text-muted-foreground">
                Verifica se as configurações estão corretas
              </p>
            </div>
            <Button variant="outline" onClick={handleTest} disabled={testR2.isPending}>
              {testR2.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span className="ml-2">Testar</span>
            </Button>
          </div>
          {testR2.isSuccess && testR2.data && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
                testR2.data.success
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {testR2.data.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{testR2.data.message}</p>
                {testR2.data.details && (
                  <div className="mt-1 text-xs opacity-80">
                    {testR2.data.details.readAccess !== undefined && (
                      <p>Leitura: {testR2.data.details.readAccess ? "OK" : "Falhou"}</p>
                    )}
                    {testR2.data.details.writeAccess !== undefined && (
                      <p>Escrita: {testR2.data.details.writeAccess ? "OK" : "Falhou"}</p>
                    )}
                    {testR2.data.details.missingFields && (
                      <p>
                        Campos ausentes: {testR2.data.details.missingFields.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Configurações R2
        </Button>
      </CardFooter>
    </Card>
  );
}
