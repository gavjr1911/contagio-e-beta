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
    throw new Error(error.error || "Erro ao carregar configuracoes");
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
    throw new Error(error.error || "Erro ao atualizar configuracoes");
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

/**
 * Retorna o valor de uma configuracao especifica da lista
 */
export function getSettingValue(settings: Setting[] | undefined, key: SettingKey): string {
  if (!settings) return "";
  const setting = settings.find((s) => s.key === key);
  return setting?.value || "";
}
