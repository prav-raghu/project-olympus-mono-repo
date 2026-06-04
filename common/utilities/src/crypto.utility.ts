import crypto from 'node:crypto';

export class CryptoUtil {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor(secret: string) {
        this.key = crypto.scryptSync(secret, 'salt', 32);
    }

    public encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    public decrypt(encryptedText: string): string {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encryptedTextBuffer = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedTextBuffer), decipher.final()]);
        return decrypted.toString();
    }
}