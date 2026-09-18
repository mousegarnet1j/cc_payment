export const validateTokenUrl = '/api/bin/validate';


export const validateBin = async (bin: string): Promise<{ data?: string; error?: string }> => {
    try {
        const response = await fetch(validateTokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bin }),
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
