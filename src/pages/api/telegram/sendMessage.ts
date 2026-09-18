import type { NextApiRequest, NextApiResponse } from 'next';

const sendTelegramMessage = async (chatId: string, text: string, botToken: string, keyboard?: any) => {
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: any = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (keyboard) {
        payload.reply_markup = keyboard;
    }
    const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Telegram API Error: ${data.description || 'Unknown error'}`);
    }
    return data;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const groupId = process.env.TELEGRAM_GROUP_ID;

    if (!botToken || !groupId) {
        return res.status(500).json({
            error: 'Faltan variables de entorno necesarias: TELEGRAM_BOT_TOKEN o TELEGRAM_GROUP_ID',
        });
    }

    const { message, keyboard } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'El campo "message" es obligatorio y debe ser un string.' });
    }

    try {
        const telegramResponse = await sendTelegramMessage(groupId, message, botToken, keyboard);
        return res.status(200).json(telegramResponse);
    } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Telegram Error]', message);
    return res.status(500).json({ 
        error: 'Error al enviar mensaje a Telegram.',
        detail: message  
    });
}
}
