import js from "@peggyjs/eslint-config/flat/module.js";
import modern from "@peggyjs/eslint-config/flat/modern.js";

export default [
  {
    ignores: [
      "node_modules/**",
      "test/minimal.js",
    ],
  },
  js,
  modern,
];
