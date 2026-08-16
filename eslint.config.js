import base from "./packages/config/eslint.config.js";

export default [
  ...base,
  {
    // apps/web tiene su propia config de eslint (eslint-config-next); no la
    // relintamos acá con la generica.
    ignores: ["spike/**", "**/dist/**", "**/.turbo/**", "**/.next/**", "apps/web/**"],
  },
];
