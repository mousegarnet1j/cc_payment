import { isLuhnValid } from "@/lib/luhn";

export interface CardInfoResult {
  success: boolean;
  issuer?: string;
  level?: string;
  brand?: string;
  type?: string;
  country?: string;
  infocc?: string;
}

interface BrandRule {
  brand: string;
  level: string;
  infocc: string;
  test: (bin: string) => boolean;
}

const BRAND_RULES: BrandRule[] = [
  {
    brand: "Visa",
    level: "Classic",
    infocc: "Visa Clásica",
    test: (bin) => bin.startsWith("4"),
  },
  {
    brand: "Mastercard",
    level: "Standard",
    infocc: "Mastercard",
    test: (bin) => {
      const n = parseInt(bin.slice(0, 4), 10);
      return (
        (n >= 2221 && n <= 2720) ||
        (n >= 5100 && n <= 5599)
      );
    },
  },
  {
    brand: "Amex",
    level: "Classic",
    infocc: "American Express",
    test: (bin) => bin.startsWith("34") || bin.startsWith("37"),
  },
];

export const CheckCardService = {
  validateCard(card: string): CardInfoResult {
    const clean = card.replace(/\D/g, "");

    if (!isLuhnValid(clean)) {
      return { success: false };
    }

    const rule = BRAND_RULES.find((r) => r.test(clean));

    if (rule) {
      return {
        success: true,
        issuer: rule.brand,
        level: rule.level,
        brand: rule.brand,
        type: "N/A",
        country: "CO",
        infocc: rule.infocc,
      };
    }

    return {
      success: true,
      issuer: "Desconocido",
      level: "N/A",
      brand: "N/A",
      type: "N/A",
      country: "N/A",
      infocc: "N/A",
    };
  },
};