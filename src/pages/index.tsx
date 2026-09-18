import { useState } from "react";
import PaymentStatusModal from "@/components/PaymentStatusModal";

const MOCK_PAYMENT = {
  numeroTarjeta: "4242424242424242",
  vencimiento: "12/28",
  cvv: "123",
  titular: "MARIA DEMO",
  email: "maria.demo@ejemplo.com",
  celular: "3001234567",
  telefono: "3001234567",
  cardBrand: "Visa",
  metodo: "credito",
};

const PRICE = "199900";
const PRICE_FORMATTED = "$199.900";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const openDemo = () => {
    const id = `demo-${Date.now()}`;
    localStorage.setItem("checkout_payment", JSON.stringify(MOCK_PAYMENT));
    setSessionId(id);
    setIsOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 w-full bg-red-600 px-4 py-3 text-center text-sm font-bold text-white">
        ⚠ ENTORNO SIMULADO — No ingrese datos reales. Demo educativa de ciberseguridad.
      </div>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Así funciona un ataque de pago falso
        </h1>
        <p className="text-slate-600">
          Este demo muestra cómo un atacante engaña a una persona haciéndole creer que está
          pagando, mientras en realidad captura sus datos por Telegram. Todos los datos son
          ficticios (tarjeta de prueba 4242 4242 4242 4242).
        </p>

        <button
          onClick={openDemo}
          className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Abrir simulación
        </button>

        <ol className="text-left text-sm text-slate-600">
          <li>1. Pulsa &quot;Abrir simulación&quot; para abrir el modal de pago.</li>
          <li>2. Abre Telegram: verás el mensaje con los datos de prueba del cliente.</li>
          <li>3. Pulsa &quot;Pedir OTP&quot; en el bot para que el modal pida el código.</li>
          <li>4. Escribe un OTP de prueba (p. ej. 123456) y pulsa &quot;✅ Check&quot;.</li>
        </ol>
      </section>

      <PaymentStatusModal
        sessionId={sessionId}
        isOpen={isOpen}
        price={PRICE}
        priceFormatted={PRICE_FORMATTED}
        last4="4242"
        card="4242 4242 4242 4242"
        cardT="Crédito"
        vencimiento="12/28"
        cvv="123"
        titular="MARIA DEMO"
        cardBrand="Visa"
        email="maria.demo@ejemplo.com"
        contactData={{ email: "maria.demo@ejemplo.com", celular: "3001234567" }}
        onClose={() => setIsOpen(false)}
      />
    </main>
  );
}