const eslintPluginImport = require("eslint-plugin-import");
const eslintPluginTs = require("@typescript-eslint/eslint-plugin");
const parserTs = require("@typescript-eslint/parser");

/** @type {import("eslint").FlatConfig[]} */
module.exports = [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTs,
      import: eslintPluginImport,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
          },
        },
      ],
      // Avoid hardcoded labels
      "no-console": "error",
      "no-extra-semi": "error",
      quotes: ["error", "single", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      indent: ["error", 2],
      "prefer-const": "off",
      "no-var": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      "arrow-body-style": ["error", "as-needed"],
      "arrow-parens": ["error", "always"],
      "@typescript-eslint/no-use-before-define": "off",
    },
  },
];
