import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import nodemailer from 'nodemailer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { type IEmailService } from '../interfaces/email.interface';
import { EnvConfig } from '../config/env.config';
import { Logger } from '@project-olympus/logging';

export class EmailService implements IEmailService {
    private readonly logger = new Logger(EmailService.name);

    public async sendMail(to: string, subject: string, template: string, variables: Record<string, unknown>): Promise<boolean> {
        try {
            const html = await this.renderTemplate(template, variables);
            if (EnvConfig.isDevelopment()) {
                return this.sendViaMailhog(to, subject, html);
            }
            return this.sendViaMailgun(to, subject, html);
        } catch (error) {
            this.logger.error('Failed to send email', error as Error);
            return false;
        }
    }

    public async sendWelcome(to: string, name: string): Promise<void> {
        await this.sendMail(to, 'Welcome!', 'welcome', { name });
    }

    public async sendPasswordReset(to: string, token: string): Promise<void> {
        await this.sendMail(to, 'Reset your password', 'password-reset', { token });
    }

    public async sendOtp(to: string, otp: string): Promise<void> {
        await this.sendMail(to, 'Your verification code', 'otp', { otp });
    }

    private async sendViaMailgun(to: string, subject: string, html: string): Promise<boolean> {
        const apiKey = EnvConfig.getOrThrow('MAILGUN_API_KEY');
        const domain = EnvConfig.getOrThrow('MAILGUN_DOMAIN');
        const from = EnvConfig.getOrThrow('MAILGUN_FROM');
        const host = EnvConfig.get('MAILGUN_HOST') ?? 'api.mailgun.net';

        const mailgun = new Mailgun(FormData);
        const client = mailgun.client({ username: 'api', key: apiKey, url: `https://${host}` });

        await client.messages.create(domain, {
            from,
            to: [to],
            subject,
            html,
        });
        this.logger.info('Email sent via Mailgun', { to, subject });
        return true;
    }

    private async sendViaMailhog(to: string, subject: string, html: string): Promise<boolean> {
        const host = EnvConfig.get('MAILHOG_HOST') ?? 'localhost';
        const port = parseInt(EnvConfig.get('MAILHOG_PORT') ?? '1025', 10);
        const from = EnvConfig.get('MAILGUN_FROM') ?? 'noreply@localhost';

        const transporter = nodemailer.createTransport({ host, port, secure: false });
        await transporter.sendMail({ from, to, subject, html });
        this.logger.info('Email sent via MailHog (dev)', { to, subject });
        return true;
    }

    private async renderTemplate(template: string, variables: Record<string, unknown>): Promise<string> {
        const basePath =
            process.env.NODE_ENV === 'production'
                ? path.resolve(__dirname, '../templates')
                : path.resolve(__dirname, '../../src/templates');
        const templateFile = path.join(basePath, `${template}.html`);

        let rawHtml: string;
        try {
            rawHtml = await fs.readFile(templateFile, 'utf-8');
        } catch (err) {
            this.logger.error('Failed to read email template', err as Error);
            throw new Error(`Email template '${template}' not found`);
        }

        return this.applyTemplate(rawHtml, variables);
    }

    private applyTemplate(html: string, variables: Record<string, unknown>): string {
        let result = html;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            if (result.includes(placeholder)) {
                result = result.replaceAll(placeholder, this.safeStringify(value));
            }
        }
        return result;
    }

    private safeStringify(value: unknown): string {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (value instanceof Date) return value.toISOString();
        return JSON.stringify(value);
    }
}
