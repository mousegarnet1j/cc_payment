import { NextRequest, NextResponse } from "next/server";
import { getPaymentState } from "@/lib/paymentStorage";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId es obligatorio" }, { status: 400 });
  }

  const state = await getPaymentState(sessionId);

  if (!state) {
    return NextResponse.json({
      status: "loading",
      timestamp: Date.now(),
    });
  }

  return NextResponse.json(state);
}