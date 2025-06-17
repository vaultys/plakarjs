module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jest"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:jest/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  ignorePatterns: ["lib/", "node_modules/", "coverage/", "*.js", "!.eslintrc.js", "!jest.config.js", "!examples/**/*.js"],
};
