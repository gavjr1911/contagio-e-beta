"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "./theme-provider";
import { useState } from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider defaultTheme="light" storageKey="beta-theme">
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          {/* O projeto usa DOIS sistemas de toast: o Radix (via use-toast),
              consumido pelas páginas do dashboard, e o sonner, usado pelos
              hooks (mídia, checklists, ministérios) e pelo export de PDF.
              O Toaster do sonner nunca foi montado, então todos esses avisos
              — inclusive erros de upload e "convite não enviado" — eram
              descartados silenciosamente. */}
          <Toaster />
          <SonnerToaster richColors closeButton position="top-right" />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
