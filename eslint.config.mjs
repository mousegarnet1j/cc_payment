import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "original/**",
      "src/components/PaymentStatusModal.tsx",
      "src/pages/api/telegram/**",
      "src/pages/api/bin/**",
      "src/services/telegram/**",
      "src/services/bin/**",
      "src/utils/paymentStorage.ts",
      "src/utils/auth.ts",
      "src/utils/formatNumber.ts",
      "src/types/**",
    ],
  },
];

export default eslintConfig;
