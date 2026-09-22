import { savePaymentState } from '@/lib/paymentStorage';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    const { sessionId, status } = req.body;


    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId es obligatorio' });
    }

    savePaymentState(sessionId, {
        status: status ?? 'loading',
        timestamp: Date.now(),
    });


    return res.status(200).json(status);

}