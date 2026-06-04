import { Logger } from "@project-olympus/logging";
import { EnvConfig } from "../config/env.config";
import { type ISmsService } from "../interfaces/sms.interface";

const WINSMS_BASE_URL = "https://api.winsms.co.za/api/rest/v1";

interface WinSmsRecipient {
    mobileNumber: string;
}

interface WinSmsSendBody {
    message: string;
    recipients: WinSmsRecipient[];
    maxSegments: number;
}

interface WinSmsResponse {
    statusCode: number;
    statusMessage: string;
}

export class SmsService implements ISmsService {
    private readonly logger = new Logger(SmsService.name);

    public async sendSms(to: string, message: string): Promise<boolean> {
        const enabled = EnvConfig.get("WINSMS_ENABLED");
        if (enabled === "false") {
            this.logger.info("SMS disabled — skipping", { to });
            return false;
        }

        const apiKey = EnvConfig.get("WINSMS_API_KEY");
        if (!apiKey) {
            this.logger.error("WINSMS_API_KEY is not set");
            return false;
        }

        const mobileNumber = this.toE164(to);
        if (!mobileNumber) {
            this.logger.error("Invalid phone number — cannot convert to E164", { to });
            return false;
        }

        try {
            const body: WinSmsSendBody = {
                message,
                recipients: [{ mobileNumber }],
                maxSegments: 1,
            };

            const response = await fetch(`${WINSMS_BASE_URL}/sms/outgoing/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    AUTHORIZATION: apiKey,
                },
                body: JSON.stringify(body),
            });

            const json = (await response.json()) as WinSmsResponse;

            if (!response.ok || json.statusCode !== 200) {
                this.logger.error("WinSMS rejected the request", { statusCode: json.statusCode, statusMessage: json.statusMessage, to });
                return false;
            }

            this.logger.info("SMS sent successfully", { to: mobileNumber });
            return true;
        } catch (error) {
            this.logger.error("Unexpected error sending SMS via WinSMS", error as Error);
            return false;
        }
    }

    private toE164(phone: string): string | null {
        const digits = phone.replace(/\D/g, "");
        if (digits.startsWith("27") && digits.length === 11) {
            return digits;
        }
        if (digits.startsWith("0") && digits.length === 10) {
            return `27${digits.slice(1)}`;
        }
        return null;
    }
}
