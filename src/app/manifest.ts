import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Contagio e Beta",
    short_name: "Beta",
    description: "Sistema de gestao de eventos da Igreja Beta",
    start_url: "/",
    display: "standalone",
    background_color: "#1B1B1B",
    theme_color: "#1B1B1B",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Minhas Escalas",
        short_name: "Escalas",
        url: "/escalas",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Eventos",
        short_name: "Eventos",
        url: "/eventos",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
