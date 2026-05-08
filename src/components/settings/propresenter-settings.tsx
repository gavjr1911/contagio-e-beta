"use client";

import { useState, useEffect } from "react";
import { Monitor, Save, Loader2, Wifi, WifiOff } from "lucide-react";
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
  useTestProPresenter,
  getSettingValue,
} from "@/hooks/use-settings";
import { SettingKey } from "@/lib/validations/settings";

export function ProPresenterSettings() {
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const testProPresenter = useTestProPresenter();

  const [proPresenterSettings, setProPresenterSettings] = useState({
    PROPRESENTER_HOST: "localhost",
    PROPRESENTER_PORT: "1025",
  });

  useEffect(() => {
    if (settings) {
      setProPresenterSettings({
        PROPRESENTER_HOST: getSettingValue(settings, "PROPRESENTER_HOST") || "localhost",
        PROPRESENTER_PORT: getSettingValue(settings, "PROPRESENTER_PORT") || "1025",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    const settingsToUpdate: { key: SettingKey; value: string }[] = [];

    if (proPresenterSettings.PROPRESENTER_HOST) {
      settingsToUpdate.push({
        key: "PROPRESENTER_HOST",
        value: proPresenterSettings.PROPRESENTER_HOST,
      });
    }

    if (proPresenterSettings.PROPRESENTER_PORT) {
      settingsToUpdate.push({
        key: "PROPRESENTER_PORT",
        value: proPresenterSettings.PROPRESENTER_PORT,
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
        description: "As configurações do ProPresenter foram atualizadas.",
      });
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
      const result = await testProPresenter.mutateAsync({
        host: proPresenterSettings.PROPRESENTER_HOST,
        port: proPresenterSettings.PROPRESENTER_PORT,
      });
      if (result.connected) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <CardTitle>ProPresenter</CardTitle>
        </div>
        <CardDescription>
          Configure a integração com o ProPresenter para sincronizar músicas e criar playlists
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="propresenter-host">Host/IP</Label>
          <Input
            id="propresenter-host"
            type="text"
            placeholder="localhost ou 192.168.1.100"
            value={proPresenterSettings.PROPRESENTER_HOST}
            onChange={(e) =>
              setProPresenterSettings((prev) => ({
                ...prev,
                PROPRESENTER_HOST: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            IP ou hostname do computador com ProPresenter
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="propresenter-port">Porta</Label>
          <Input
            id="propresenter-port"
            type="number"
            placeholder="1025"
            value={proPresenterSettings.PROPRESENTER_PORT}
            onChange={(e) =>
              setProPresenterSettings((prev) => ({
                ...prev,
                PROPRESENTER_PORT: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Porta da API (padrão: 1025). Habilite em Settings &gt; Network no ProPresenter.
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Testar Conexão</p>
              <p className="text-xs text-muted-foreground">
                Verifica se o ProPresenter está acessível
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testProPresenter.isPending}
            >
              {testProPresenter.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              <span className="ml-2">Testar</span>
            </Button>
          </div>
          {testProPresenter.isSuccess && testProPresenter.data && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
                testProPresenter.data.connected
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {testProPresenter.data.connected ? (
                <Wifi className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{testProPresenter.data.message}</p>
                {testProPresenter.data.version && (
                  <p className="text-xs opacity-80 mt-1">
                    {testProPresenter.data.version.name} v
                    {testProPresenter.data.version.version}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">Como habilitar a API no ProPresenter:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Abra o ProPresenter 7.9 ou superior</li>
            <li>Vá em Settings &gt; Network</li>
            <li>Habilite &quot;Enable Network&quot; (API)</li>
            <li>Anote a porta (padrão: 1025)</li>
            <li>Se necessário, permita o acesso no firewall</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </CardFooter>
    </Card>
  );
}
