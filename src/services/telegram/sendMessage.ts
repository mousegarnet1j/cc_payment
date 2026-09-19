export const sendTelegramMessageUrl = '/api/telegram/sendMessage';

export const sendMessage = async (message: string, keyboard?: any, sessionId?: string): Promise<{ data?: string; error?: string }> => {
    try {
        const response = await fetch(sendTelegramMessageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, message, ...(keyboard ? { keyboard } : {}) }),
            cache: 'no-store',
        });

        if (!response.ok) {
            return { error: `HTTP Error: ${response.status}` };
        }

        const { result } = await response.json();
        return { data: result };

    } catch (error) {
        console.error('Bin validation failed', error);
        return { error: 'Internal Server Error' };
    }
};