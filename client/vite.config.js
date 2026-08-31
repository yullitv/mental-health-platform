import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Дозволяє тестувати PWA прямо через `npm run dev`, без окремого build
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Опора — платформа психологічної підтримки",
        short_name: "Опора",
        description:
          "Твій персональний простір для емоційного балансу та підтримки.",
        theme_color: "#6C5DD3",
        background_color: "#f8f7fc",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "uk",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
