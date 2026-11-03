import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// A plain object, not the function form: vitest.config.ts merges it.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "index.ts",
      // A new version waits for the user's go (UpdatePrompt); see src/sw/base.ts.
      registerType: "prompt",
      injectRegister: "auto",
      injectManifest: {
        // Spec 7: the app, every 640 px photo, the 1280 px file of each animal's
        // first photo, all sounds and speech clips. Other sizes: runtime cache
        // (src/sw/index.ts).
        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,woff2}",
          "photos/*/*-640.webp",
          "photos/*/1-1280.webp",
          "sounds/*.m4a",
          "speech/*.m4a",
        ],
      },
      devOptions: { enabled: false, type: "module" },
      manifest: {
        id: "/",
        name: "Tiere",
        short_name: "Tiere",
        description: "Echte Tierfotos für Kinder ab 2: tippen, Name und Tierlaut hören – offline.",
        lang: "de",
        dir: "ltr",
        // accent-600 of the app's hue, as hex (#a71f65 is hue 355)
        theme_color: "#a71f65",
        background_color: "#ffffff",
        // Photos on the whole screen; browsers without fullscreen fall back to
        // standalone on their own (spec 7). Portrait and landscape.
        display: "fullscreen",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
