import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: { ignorePatterns: ["**/*.gen.ts"] },
  lint: {
    ignorePatterns: ["**/*.gen.ts"],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.output/**"],
  },
  run: {
    cache: true,
  },
});
