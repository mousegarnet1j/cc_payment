import { getPaymentState } from '@/utils/paymentStorage';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido. Usa GET.' });
    }

    const { sessionId } = req.query;


    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId es obligatorio' });
    }

    const state = await getPaymentState(sessionId);
    
    

    if (!state) {
        return res.status(200).json({
            status: 'loading',
            timestamp: Date.now(),
        });
    }

    return res.status(200).json(state);
}