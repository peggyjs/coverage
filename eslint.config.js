import js from "@peggyjs/eslint-config/module.js";
import modern from "@peggyjs/eslint-config/modern.js";

export default [
  {
    ignores: [
      "node_modules/**",
      "test/minimal.js",
      "**/*.ts",
    ],
  },
  ...js,
  ...modern,
];
