import { NextRequest, NextResponse } from "next/server";

type CardData = {
  bin: string;
};

type ApiResponse = {
  scheme?: string;
  card_type?: string;
  product_type?: string;
  issuer?: string;
  issuer_country?: string;
};

export async function POST(req: NextRequest) {
  const { bin }: CardData = await req.json().catch(() => ({}));

  if (!bin) {
    return NextResponse.json({ error: "Missing required card data" }, { status: 400 });
  }

  const payload = {
    type: "card",
    number: bin,
    expiry_month: 12,
    expiry_year: 30,
    cvv: 123,
    name: "PEDRO MONTES",
    billing_address: { country: "CO" },
    phone: {},
    preferred_scheme: "",
    requestSource: "JS",
  };

  try {
    const response = await fetch("https://api.checkout.com/tokens", {
      method: "POST",
      headers: {
        Authorization: process.env.API_BIN_TOKEN!,
        "Content-Type": "application/json",
        Referer: "https://js.checkout.com/",
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:28.0) Gecko/20100101 Firefox/28.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "API request failed", details: errorData },
        { status: response.status },
      );
    }

    const responseData: ApiResponse = await response.json();

    const brand = responseData.scheme || "Desconocido";
    const type = responseData.card_type || "Desconocido";
    const category = (responseData.product_type || "Desconocido").replace("®", "");
    const issuer = responseData.issuer || "Desconocido";
    const country = responseData.issuer_country || "Desconocido";

    return NextResponse.json({
      brand,
      type,
      category,
      issuer,
      country,
      result: `${issuer} - NIVEL: ${category}`,
    });
  } catch (error) {
    console.error("Error processing card:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}