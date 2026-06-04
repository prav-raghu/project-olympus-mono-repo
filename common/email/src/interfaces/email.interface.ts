export interface IEmailService {
    sendMail(to: string, subject: string, template: string, variables: Record<string, unknown>): Promise<boolean>;
    sendWelcome(to: string, name: string): Promise<void>;
    sendPasswordReset(to: string, token: string): Promise<void>;
    sendOtp(to: string, otp: string): Promise<void>;
}

export interface MailgunConfig {
    apiKey: string;
    domain: string;
    host?: string;
}
