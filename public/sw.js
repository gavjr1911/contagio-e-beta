/*
 * Service worker "kill-switch".
 *
 * O PWA via Serwist está DESABILITADO (incompatível com o build Turbopack do
 * Next 16 — ver next.config.ts). Este arquivo existe só para REMOVER qualquer
 * service worker antigo que tenha ficado registrado no navegador de usuários
 * em builds anteriores. Um SW preso servindo cache estava causando tela
 * piscando, conteúdo vazio e dados desatualizados.
 *
 * Ele limpa todos os caches, se desregistra e NÃO intercepta requisições
 * (sem handler de 'fetch'). Como a aplicação não chama mais register(), não
 * há risco de loop de re-registro.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // ignora falhas de limpeza de cache
      }
      await self.registration.unregister();
    })()
  );
});
