import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "public/**",
      "dashboard/backend/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off" // Turn off img element warnings since they are intentionally used in SVGs or specific canvas features
    }
  }
];
