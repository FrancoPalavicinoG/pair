// @ts-check
import tseslint from "typescript-eslint";

// Config base de ESLint compartida por el workspace.
export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
  },
});
