export const SavePaymentStateUrl = '/api/telegram/savePaymentState';


export const savePaymentStateService = async (sessionId: string, status?: string): Promise<{ data?: string; error?: string }> => {
    try {
        const response = await fetch(SavePaymentStateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, status }),
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
