import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// PWA/service worker DESABILITADO: o @serwist/next não suporta o build
// Turbopack do Next 16 (não gerava o sw.js → /sw.js dava 404 em produção).
// public/sw.js agora é um kill-switch estático que remove SWs antigos presos.
// Para reativar o PWA de verdade no futuro: migrar para @serwist/turbopack
// ou buildar com webpack, e remover o public/sw.js estático.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-b1ab7408bb5a497b88b0cb9298f5ac2b.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

/**
 * CSP baseline.
 *
 * `'unsafe-inline'` é necessário hoje em script-src (script inline de tema em
 * layout.tsx + bootstrap inline do Next) e style-src (Tailwind/Radix injetam
 * <style> inline). Endurecer para nonce/hash fica como follow-up.
 *
 * Origens externas permitidas: Cloudflare R2 — bucket público (`*.r2.dev`,
 * usado em <img>) e endpoint S3 (`*.r2.cloudflarestorage.com`, usado no PUT
 * de upload via presigned URL). `worker-src`/`blob:` cobrem o service worker
 * (Serwist/PWA).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  // Google Fonts é importado em runtime via @import em globals.css (e cacheado no sw.ts).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com",
  // <video>/<audio> de mídia servidos direto do bucket público R2.
  "media-src 'self' blob: https://*.r2.dev",
  // connect-src: API própria + PUT de upload presigned para o endpoint S3 do R2.
  "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export default withSerwist(nextConfig);
