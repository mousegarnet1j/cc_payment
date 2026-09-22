import { NextRequest, NextResponse } from "next/server";
import { savePaymentState } from "@/lib/paymentStorage";

export async function POST(req: NextRequest) {
  const { sessionId, status } = await req.json().catch(() => ({}));

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId es obligatorio" }, { status: 400 });
  }

  savePaymentState(sessionId, {
    status: status ?? "loading",
    timestamp: Date.now(),
  });

  return NextResponse.json(status ?? "loading");
}
