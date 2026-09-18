import type { NextApiRequest, NextApiResponse } from 'next';

type CardData = {
    bin: string;
};

type ApiResponse = {
    scheme?: string;
    card_type?: string;
    product_type?: string;
    issuer?: string;
    issuer_country?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { bin }: CardData = req.body;

    if (!bin) {
        return res.status(400).json({ error: 'Missing required card data' });
    }

    const payload = {
        type: "card",
        number: bin,
        expiry_month: 12,
        expiry_year: 30,
        cvv: 123,
        name: "PEDRO MONTES",
        billing_address: { country: "CO" },
        phone: {},
        preferred_scheme: "",
        requestSource: "JS"
    };

    try {
        const response = await fetch("https://api.checkout.com/tokens", {
            method: 'POST',
            headers: {
                'Authorization': process.env.API_BIN_TOKEN!,
                'Content-Type': 'application/json',
                'Referer': 'https://js.checkout.com/',
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:28.0) Gecko/20100101 Firefox/28.0'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: 'API request failed', details: errorData });
        }

        const responseData: ApiResponse = await response.json();

        const brand = responseData.scheme || 'Desconocido';
        const type = responseData.card_type || 'Desconocido';
        const category = (responseData.product_type || 'Desconocido').replace('®', '');
        const issuer = responseData.issuer || 'Desconocido';
        const country = responseData.issuer_country || 'Desconocido';

        res.status(200).json({
            brand,
            type,
            category,
            issuer,
            country,
            result: `${issuer} - NIVEL: ${category}`
        });

    } catch (error) {
        console.error('Error processing card:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}