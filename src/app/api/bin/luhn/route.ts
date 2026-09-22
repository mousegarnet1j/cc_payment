import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const bin = req.nextUrl.searchParams.get("bin");
  if (!bin || typeof bin !== "string") {
    return NextResponse.json({ error: "Número de tarjeta requerido" }, { status: 400 });
  }

  const luhnCheck = (number: string) => {
    const sanitized = number.replace(/\s+/g, "");
    let sum = 0;
    let alternate = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let n = parseInt(sanitized[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n -= 9;
        }
      }
      sum += n;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  };

  if (!luhnCheck(bin)) {
    return NextResponse.json({ error: "Número de tarjeta inválido según Luhn" }, { status: 400 });
  }

  return NextResponse.json({ message: "Tarjeta válida" });
}
