export interface CardMeta {
  cardBrand: string;
  metodo: string;
}

const SCHEME_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  "american express": "Amex",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
};

const TYPE_METODO: Record<string, string> = {
  credit: "credito",
  debit: "debito",
  prepaid: "prepago",
  charge: "cargo",
};

export function mapCardMeta(scheme?: string, type?: string): CardMeta {
  const schemeKey = (scheme ?? "").toLowerCase().trim();
  const typeKey = (type ?? "").toLowerCase().trim();

  return {
    cardBrand: SCHEME_LABELS[schemeKey] ?? (schemeKey ? schemeKey.toUpperCase() : "Desconocida"),
    metodo: TYPE_METODO[typeKey] ?? (typeKey ? typeKey : ""),
  };
}

const BANK_TOKENS: Array<[string[], string]> = [
  [["bancolombia"], "bancolombia"],
  [["davivienda"], "davivienda"],
  [["bogota", "bogotá"], "bogota"],
  [["occidente"], "occidente"],
  [["popular"], "popular"],
  [["bbva"], "bbva"],
  [["caja social", "social"], "social"],
  [["agrario"], "agrario"],
  [["bancamia", "bancamía"], "bancamia"],
  [["villas"], "villas"],
  [["colpatria"], "colpatria"],
  [["citibank"], "citibank"],
  [["itau", "itáu", "itá", "itaú"], "itau"],
  [["falabella"], "falabella"],
  [["pichincha"], "pichincha"],
  [["nubank"], "nubank"],
  [["nequi"], "nequi"],
  [["tuya"], "tuya"],
  [["rappi"], "rappi"],
];

export function mapBankName(name?: string): string | undefined {
  const n = (name ?? "").toLowerCase().trim();
  if (!n) return undefined;

  const match = BANK_TOKENS.find(([tokens]) => tokens.some((t) => n.includes(t)));
  return match ? match[1] : undefined;
}