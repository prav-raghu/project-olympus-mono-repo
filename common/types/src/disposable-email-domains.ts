export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
    "yopmail.com",
    "yopmail.fr",
    "yopmail.net",
    "proton.me",
    "protonmail.com",
    "mailinator.com",
    "guerrillamail.com",
    "guerrillamail.info",
    "guerrillamail.biz",
    "guerrillamail.de",
    "sharklasers.com",
    "10minutemail.com",
    "10minutemail.net",
    "tempmail.com",
    "temp-mail.org",
    "throwawaymail.com",
    "trashmail.com",
    "trashmail.net",
    "getnada.com",
    "dispostable.com",
    "fakeinbox.com",
    "mailnesia.com",
    "maildrop.cc",
    "mintemail.com",
    "moakt.com",
    "emailondeck.com",
    "spamgourmet.com",
]);

export function isDisposableEmailDomain(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    return domain !== undefined && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
