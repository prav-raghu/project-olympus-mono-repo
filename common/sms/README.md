# @doctor-sm-practice/sms

Transactional SMS via [WinSMS](https://winsms.co.za) (South African gateway).

## Usage

```typescript
import { SmsService } from '@doctor-sm-practice/sms';

const sms = new SmsService();

const sent = await sms.sendSms('+27821234567', 'Your booking is confirmed for 14:00.');
```

`sendSms` returns `boolean` — `false` indicates the send failed (logged) or that SMS was intentionally disabled. It does not throw.

## Phone Number Normalisation

Numbers are normalised to E.164-ish digits before submission:

- `+27 82 123 4567` → `27821234567`
- `0821234567` → `27821234567`
- Anything else → rejected (returns `false`, logs error)

This package is SA-only at the moment. Add a different normaliser if you onboard non-ZA users.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `WINSMS_API_KEY` | Yes | WinSMS API key (sent as `AUTHORIZATION` header) |
| `WINSMS_ENABLED` | Yes | Set to the string `"false"` to short-circuit all sends — useful in dev/staging |
