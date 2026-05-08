"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
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
  getSettingValue,
} from "@/hooks/use-settings";

export function GeneralSettings() {
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [generalSettings, setGeneralSettings] = useState({
    APP_NAME: "",
  });

  useEffect(() => {
    if (settings) {
      setGeneralSettings({
        APP_NAME: getSettingValue(settings, "APP_NAME"),
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!generalSettings.APP_NAME) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da aplicação é obrigatório.",
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
        title: "Configurações salvas",
        description: "As configurações gerais foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configurações Gerais</CardTitle>
        </div>
        <CardDescription>Configurações gerais da aplicação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-name">Nome da Aplicação</Label>
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
            Este nome será exibido nos emails e na interface
          </p>
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
          Salvar Configurações Gerais
        </Button>
      </CardFooter>
    </Card>
  );
}
