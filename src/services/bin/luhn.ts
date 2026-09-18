export const luhnUrl = '/api/bin/luhn';


export const validateBinLuhn = async (
    bin: string
): Promise<{ message?: string; error?: string }> => {
    try {
        const response = await fetch(`${luhnUrl}?bin=${bin}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || 'Error validando tarjeta' };
        }

        return { message: data.message };
    } catch (error) {
        console.error('Bin validation failed', error);
        return { error: 'Internal Server Error' };
    }
};