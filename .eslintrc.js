module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    "eslint:recommended"
  ],
  globals: { "GOOGLE_AUD": true, "PARTICLE_GOOGLE_AUTH": true, "ALEXA_AUD": true },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module"
  },
  rules: {
    quotes: [
      1,
      "double",
      "avoid-escape"
    ]
  }
}
