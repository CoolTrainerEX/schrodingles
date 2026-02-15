import { defineConfig } from "orval";

export default defineConfig({
  // HTTP client generation
  api: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      mode: "tags-split",
      client: "react-query",
      target: "src/api/endpoints",
      schemas: "src/api/models",
      mock: true,
      baseUrl: "/api",
    },
  },
  // Zod schema generation
  apiZod: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "src/api/endpoints",
      fileExtension: ".zod.ts",
    },
  },
});
