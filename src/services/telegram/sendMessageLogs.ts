export const sendTelegramMessageLogsUrl = '/api/telegram/sendMessageLogs';


export const sendMessageLogs = async (message: string): Promise<{ data?: string; error?: string }> => {
    try {
        const response = await fetch(sendTelegramMessageLogsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
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
