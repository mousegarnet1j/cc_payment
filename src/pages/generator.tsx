import { useState } from "react";

const MOCK = {
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
  const [redirectSuccess, setRedirectSuccess] = useState("https://tienda.example/pago-ok");
  const [redirectDeclined, setRedirectDeclined] = useState("https://tienda.example/tarjeta-declinada");
  const [result, setResult] = useState<{ url: string; iframe: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
            cardBrand: form.cardBrand,
            metodo: form.metodo,
          },
          price: form.price,
          priceFormatted: form.priceFormatted,
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
          Herramienta del presentador. Prepara los datos y las URLs de redirección, genera la URL
          cifrada y copia el iframe en la página de la tienda.
        </p>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Número de tarjeta" value={form.numeroTarjeta} onChange={set("numeroTarjeta")} inputMode="numeric" />
          <Field label="Vencimiento" value={form.vencimiento} onChange={set("vencimiento")} />
          <Field label="CVV" value={form.cvv} onChange={set("cvv")} inputMode="numeric" />
          <Field label="Banco / marca" value={form.cardBrand} onChange={set("cardBrand")} />
          <Field label="Titular" value={form.titular} onChange={set("titular")} />
          <Field label="Método" value={form.metodo} onChange={set("metodo")} />
          <Field label="Email" value={form.email} onChange={set("email")} type="email" />
          <Field label="Celular" value={form.celular} onChange={set("celular")} inputMode="numeric" />
          <Field label="Teléfono" value={form.telefono} onChange={set("telefono")} inputMode="numeric" />
          <Field label="Precio" value={form.price} onChange={set("price")} inputMode="numeric" />
          <Field label="Precio formateado" value={form.priceFormatted} onChange={set("priceFormatted")} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4">
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