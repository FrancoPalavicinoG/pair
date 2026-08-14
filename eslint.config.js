import base from "./packages/config/eslint.config.js";

export default [
  ...base,
  {
    ignores: ["spike/**", "**/dist/**", "**/.turbo/**"],
  },
];
