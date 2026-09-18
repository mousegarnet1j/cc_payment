import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { bin } = req.query;
    if (!bin || typeof bin !== 'string') {
        return res.status(400).json({ error: 'Número de tarjeta requerido' });
    }

    const luhnCheck = (number:string) => {
        const sanitized = number.replace(/\s+/g, '');
        let sum = 0;
        let alternate = false;

        for (let i = sanitized.length - 1; i >= 0; i--) {
            let n = parseInt(sanitized[i], 10);
            if (alternate) {
                n *= 2;
                if (n > 9) {
                    n -= 9;
                }
            }
            sum += n;
            alternate = !alternate;
        }

        return sum % 10 === 0;
    };

    if (!luhnCheck(bin)) {
        return res.status(400).json({ error: 'Número de tarjeta inválido según Luhn' });
    }

    return res.status(200).json({ message: 'Tarjeta válida' });
}