import { defineConfig } from "astro/config";
import aws from "astro-sst";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: aws({
    serverRoutes: ["api/*"],
  }),
  integrations: [react(), tailwind()],
});
