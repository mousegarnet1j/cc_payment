import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionCredentials } from "@/lib/sessionCredentials";
import { ensureWebhook } from "@/lib/webhookRegistration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { sessionId, message, keyboard } = req.body;

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId es obligatorio." });
  }
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "El campo message es obligatorio." });
  }

  const creds = await getSessionCredentials(sessionId);
  if (!creds) {
    return res.status(500).json({ error: "Sesión no válida o expirada." });
  }

  await ensureWebhook(creds.botToken);

  const payload: Record<string, unknown> = {
    chat_id: creds.chatId,
    text: message,
    parse_mode: "HTML",
  };
  if (keyboard) payload.reply_markup = keyboard;

  try {
    const response = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description || "Unknown error");
    return res.status(200).json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram Error]", detail);
    return res.status(500).json({ error: "Error al enviar mensaje a Telegram.", detail });
  }
}