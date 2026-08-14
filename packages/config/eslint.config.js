// @ts-check
import tseslint from "typescript-eslint";

/** Base ESLint config compartida. Cada paquete la extiende con su propio tsconfig. */
export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
  },
});
