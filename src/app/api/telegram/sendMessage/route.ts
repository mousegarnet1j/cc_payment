import { NextRequest, NextResponse } from "next/server";
import { getSessionCredentials } from "@/lib/sessionCredentials";
import { ensureWebhook } from "@/lib/webhookRegistration";
import { isInitialNotified, isRateLimited, markInitialNotified } from "@/lib/antiSpam";

const MAX_MSG_PER_SESSION = 100;
const SESSION_WINDOW_SECONDS = 3600;

export async function POST(req: NextRequest) {
  const { sessionId, message, keyboard, firstMessage } = await req.json().catch(() => ({}));

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId es obligatorio." }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "El campo message es obligatorio." }, { status: 400 });
  }

  const creds = await getSessionCredentials(sessionId);
  if (!creds) {
    return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 500 });
  }

  if (firstMessage && (await isInitialNotified(sessionId))) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (await isRateLimited(`rl:session:${sessionId}`, MAX_MSG_PER_SESSION, SESSION_WINDOW_SECONDS)) {
    return NextResponse.json({ error: "Límite de mensajes de la sesión." }, { status: 429 });
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
    if (firstMessage) await markInitialNotified(sessionId);
    return NextResponse.json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram Error]", detail);
    return NextResponse.json({ error: "Error al enviar mensaje a Telegram.", detail }, { status: 500 });
  }
}