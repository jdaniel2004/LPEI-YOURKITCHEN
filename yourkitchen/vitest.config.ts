import { defineConfig } from "vitest/config";

// Suite de testes unitários da lógica de negócio pura (sem dependências de
// runtime do Next). Corre com `npm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
