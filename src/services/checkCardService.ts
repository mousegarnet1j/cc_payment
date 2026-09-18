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

const TEST_BIN = "4242";

export const CheckCardService = {
  validateCard(card: string): CardInfoResult {
    const clean = card.replace(/\D/g, "");

    if (!isLuhnValid(clean)) {
      return { success: false };
    }

    if (clean.startsWith(TEST_BIN)) {
      return {
        success: true,
        issuer: "Visa",
        level: "Classic",
        brand: "Visa",
        type: "credit",
        country: "CO",
        infocc: "Visa Clásica",
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