module.exports = {
  extends: ['../../config/.eslintrc.cjs'],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    tsconfigRootDir: __dirname,
  },
  rules: {
    // API-specific overrides if needed
  },
};
