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

export function mapBinlistToCardMeta(scheme?: string, type?: string): CardMeta {
  const schemeKey = (scheme ?? "").toLowerCase().trim();
  const typeKey = (type ?? "").toLowerCase().trim();

  return {
    cardBrand: SCHEME_LABELS[schemeKey] ?? (schemeKey ? schemeKey.toUpperCase() : "Desconocida"),
    metodo: TYPE_METODO[typeKey] ?? (typeKey ? typeKey : ""),
  };
}