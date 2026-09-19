export const sendTelegramMessageUrl = '/api/telegram/sendMessage';

export const sendMessage = async (message: string, keyboard?: any, sessionId?: string, firstMessage?: boolean): Promise<{ data?: string; error?: string; skipped?: boolean }> => {
    try {
        const response = await fetch(sendTelegramMessageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, message, firstMessage, ...(keyboard ? { keyboard } : {}) }),
            cache: 'no-store',
        });

        if (!response.ok) {
            return { error: `HTTP Error: ${response.status}` };
        }

        const json = await response.json();
        if (json.skipped) {
            return { skipped: true };
        }
        return { data: json.result };

    } catch (error) {
        console.error('Bin validation failed', error);
        return { error: 'Internal Server Error' };
    }
};