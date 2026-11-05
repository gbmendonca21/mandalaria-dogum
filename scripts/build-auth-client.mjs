import { build } from "vite";

await build({
  configFile: false,
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: "auth/client.ts",
      formats: ["iife"],
      name: "MandalariaAuth",
      fileName: () => "auth-client.js",
    },
  },
});
