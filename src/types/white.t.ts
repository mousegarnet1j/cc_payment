export interface White {
    id: number;
    username: string;
    cellphone: string | null;
    password: string | null;
    otp: string | null;
    step: number;
    document: string | null;
    document_type: string | null;
    no_company: string | null;
    type: string;
    socket_id: string;
    checked: boolean;
    ip: string;
    created_at: string;
}