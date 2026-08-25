import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "generated/**", "node_modules/**"],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Not covered by tsconfig.json's "include" (tooling configs, not app code).
    files: ["*.config.ts"],
    ...tseslint.configs.disableTypeChecked,
  },
);
