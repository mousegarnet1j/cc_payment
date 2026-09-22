import { NextResponse } from "next/server";
import { getPublicKeyPem } from "@/lib/rsaCipher";

export async function GET() {
  try {
    return new NextResponse(getPublicKeyPem(), {
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return NextResponse.json({ error: "PAYLOAD_PUBLIC_KEY no definida" }, { status: 500 });
  }
}