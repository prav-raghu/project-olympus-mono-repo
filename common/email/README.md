# @project-olympus/email

Email service package. Uses Mailgun in production and MailHog SMTP in local development — switching is automatic based on `NODE_ENV`.

## Usage

```typescript
import { EmailService } from '@project-olympus/email';

const emailService = new EmailService();

await emailService.sendWelcome('user@example.com', 'Jane');
await emailService.sendPasswordReset('user@example.com', resetToken);
await emailService.sendOtp('user@example.com', '123456');
await emailService.sendMail('user@example.com', 'Subject', 'template-name', { key: 'value' });
```

## Routing

| Environment | Transport |
| --- | --- |
| `development` / unset | MailHog SMTP (`localhost:1025`) |
| `production` | Mailgun REST API |

## Templates

HTML templates live in `src/templates/`. Placeholders use `{{variableName}}` syntax.

## Environment

```env
# Production (Mailgun)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_HOST=api.mailgun.net
MAILGUN_FROM=noreply@yourdomain.com

# Development (MailHog — defaults shown)
MAILHOG_HOST=localhost
MAILHOG_PORT=1025
```

MailHog UI is available at <http://localhost:8025> when the dev Docker stack is running.
