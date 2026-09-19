export const validateTokenUrl = '/api/bin/validate';

export interface ValidateCardResult {
  brand: string;
  type: string;
  category: string;
  issuer: string;
  country: string;
  result: string;
}

export const validateBin = async (
  bin: string
): Promise<{ data?: ValidateCardResult; error?: string }> => {
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

    const json = (await response.json()) as Partial<ValidateCardResult>;

    return {
      data: {
        brand: json.brand || 'Desconocido',
        type: json.type || 'Desconocido',
        category: json.category || 'Desconocido',
        issuer: json.issuer || 'Desconocido',
        country: json.country || 'Desconocido',
        result: json.result || '',
      },
    };
  } catch (error) {
    console.error('Bin validation failed', error);
    return { error: 'Internal Server Error' };
  }
};