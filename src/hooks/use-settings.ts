"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SettingKey,
  SettingResponse,
  UpdateSettingInput,
} from "@/lib/validations/settings";

// Query keys
export const settingsKeys = {
  all: ["settings"] as const,
  list: () => [...settingsKeys.all, "list"] as const,
};

// Types
export interface Setting {
  key: SettingKey;
  value: string;
  encrypted: boolean;
  /** true quando a chave está definida via variável de ambiente (Railway) */
  envConfigured?: boolean;
  updatedAt: string | null;
}

export interface UpdateSettingsData {
  settings: UpdateSettingInput[];
}

export interface TestEmailData {
  to: string;
}

export interface TestEmailResponse {
  message: string;
  emailId?: string;
  to: string;
}

// API functions
async function fetchSettings(): Promise<Setting[]> {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar configurações");
  }
  const result = await response.json();
  return result.data;
}

async function updateSettings(data: UpdateSettingsData): Promise<SettingResponse[]> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar configurações");
  }
  const result = await response.json();
  return result.data;
}

async function testEmail(data: TestEmailData): Promise<TestEmailResponse> {
  const response = await fetch("/api/settings/test-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao enviar email de teste");
  }
  const result = await response.json();
  return result.data;
}

// Hooks

/**
 * Hook para buscar todas as configuracoes do sistema
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.list(),
    queryFn: fetchSettings,
  });
}

/**
 * Hook para atualizar uma ou mais configuracoes
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Hook para atualizar uma unica configuracao
 * Wrapper conveniente para useUpdateSettings
 */
export function useUpdateSetting() {
  const updateSettingsMutation = useUpdateSettings();

  return {
    ...updateSettingsMutation,
    mutate: (data: UpdateSettingInput, options?: Parameters<typeof updateSettingsMutation.mutate>[1]) => {
      updateSettingsMutation.mutate({ settings: [data] }, options);
    },
    mutateAsync: async (data: UpdateSettingInput) => {
      return updateSettingsMutation.mutateAsync({ settings: [data] });
    },
  };
}

/**
 * Hook para enviar email de teste
 */
export function useTestEmail() {
  return useMutation({
    mutationFn: testEmail,
  });
}

// ========================================
// R2 Storage Test
// ========================================

export interface TestR2Response {
  success: boolean;
  message: string;
  details?: {
    configured: boolean;
    readAccess?: boolean;
    writeAccess?: boolean;
    bucketName?: string;
    publicUrl?: string;
    missingFields?: string[];
  };
}

async function testR2(): Promise<TestR2Response> {
  const response = await fetch("/api/settings/test-r2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao testar conexão R2");
  }
  const result = await response.json();
  return result.data;
}

/**
 * Hook para testar conexão com R2
 */
export function useTestR2() {
  return useMutation({
    mutationFn: testR2,
  });
}

/**
 * Retorna o valor de uma configuracao especifica da lista
 */
export function getSettingValue(settings: Setting[] | undefined, key: SettingKey): string {
  if (!settings) return "";
  const setting = settings.find((s) => s.key === key);
  return setting?.value || "";
}

/**
 * Indica se a configuração está definida via variável de ambiente (Railway).
 */
export function isSettingEnvConfigured(
  settings: Setting[] | undefined,
  key: SettingKey
): boolean {
  if (!settings) return false;
  return settings.find((s) => s.key === key)?.envConfigured ?? false;
}

// ========================================
// ProPresenter Connection Test
// ========================================

export interface TestProPresenterResponse {
  success: boolean;
  connected: boolean;
  message: string;
  version?: {
    name: string;
    version: string;
  };
  config: {
    host: string;
    port: number;
  };
}

async function testProPresenter(host?: string, port?: string): Promise<TestProPresenterResponse> {
  const params = new URLSearchParams();
  if (host) params.set("host", host);
  if (port) params.set("port", port);

  const response = await fetch(`/api/propresenter/status?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao testar conexão com ProPresenter");
  }
  const result = await response.json();
  return {
    success: result.connected,
    connected: result.connected,
    message: result.connected
      ? `Conectado ao ProPresenter ${result.version?.version || ""}`
      : result.state?.lastError || "Nao foi possivel conectar ao ProPresenter",
    version: result.version,
    config: result.config,
  };
}

/**
 * Hook para testar conexão com ProPresenter
 */
export function useTestProPresenter() {
  return useMutation({
    mutationFn: ({ host, port }: { host?: string; port?: string }) =>
      testProPresenter(host, port),
  });
}
