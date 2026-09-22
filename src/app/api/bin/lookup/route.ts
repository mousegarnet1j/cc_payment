import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const bin = (req.nextUrl.searchParams.get("bin") ?? "").replace(/\D/g, "").slice(0, 8);

  if (!bin || bin.length < 6) {
    return NextResponse.json({ error: "BIN inválido" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept-Version": "3" },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "BIN no encontrado" }, { status: 404 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Error consultando BIN" }, { status: 500 });
  }
}