# Utilities Package

Shared utility functions and helper methods used across all applications.

## Overview

This package provides common utility functions for cryptographic operations, data manipulation, validation, formatting, and other helper functions that are used across multiple services in the monorepo.

## Features

- **Cryptographic Utilities**: Hashing, encryption, token generation
- **OTP Generation**: One-time password creation and validation
- **Time Utilities**: Date/time manipulation and formatting
- **Data Validation**: Input validation helpers
- **String Manipulation**: String formatting and sanitization
- **Array Utilities**: Array manipulation helpers
- **Object Utilities**: Deep merge, clone, and comparison

## Installation

This package is automatically available to all workspace packages via pnpm workspaces.

```bash
# In your service's package.json
{
  "dependencies": {
    "@common/utilities": "workspace:*"
  }
}
```

## Usage

### Cryptographic Utilities

```typescript
import { 
  hashPassword, 
  comparePassword, 
  generateToken,
  encrypt,
  decrypt 
} from '@common/utilities';

// Password hashing
const hashedPassword = await hashPassword('myPassword123');
const isValid = await comparePassword('myPassword123', hashedPassword);

// Generate secure tokens
const token = generateToken(32); // 32-byte random token
const apiKey = generateToken(64);

// Encryption/Decryption
const encrypted = encrypt('sensitive data', 'encryption-key');
const decrypted = decrypt(encrypted, 'encryption-key');
```

### OTP Utilities

```typescript
import { generateOTP, validateOTP, createOTPHash } from '@common/utilities';

// Generate 6-digit OTP
const otp = generateOTP(6);
console.log(otp); // e.g., "123456"

// Generate OTP with custom length
const longOTP = generateOTP(8);

// Create hash for storage
const otpHash = createOTPHash(otp);

// Validate OTP
const isValid = validateOTP(otp, otpHash);
```

### Time Utilities

```typescript
import { 
  formatDate,
  addDays,
  addHours,
  isExpired,
  getTimeDifference,
  convertToTimezone 
} from '@common/utilities';

// Format dates
const formatted = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');

// Date arithmetic
const tomorrow = addDays(new Date(), 1);
const nextHour = addHours(new Date(), 1);

// Check expiration
const expired = isExpired(expiryDate);

// Get time difference
const diff = getTimeDifference(startDate, endDate);
console.log(diff.hours, diff.minutes);

// Timezone conversion
const utcDate = convertToTimezone(date, 'UTC');
const estDate = convertToTimezone(date, 'America/New_York');
```

### String Utilities

```typescript
import { 
  sanitizeInput,
  slugify,
  truncate,
  capitalizeFirst,
  toTitleCase 
} from '@common/utilities';

// Sanitize user input
const clean = sanitizeInput('<script>alert("xss")</script>');

// Create URL-friendly slugs
const slug = slugify('Hello World! This is a Test');
// Output: "hello-world-this-is-a-test"

// Truncate strings
const short = truncate('Very long text here...', 20);
// Output: "Very long text he..."

// Capitalize
const capitalized = capitalizeFirst('hello world');
const title = toTitleCase('hello world');
```

### Validation Utilities

```typescript
import { 
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidUUID,
  isStrongPassword 
} from '@common/utilities';

// Email validation
const validEmail = isValidEmail('user@example.com');

// Phone validation
const validPhone = isValidPhone('+1234567890');

// URL validation
const validUrl = isValidUrl('https://example.com');

// UUID validation
const validUUID = isValidUUID('123e4567-e89b-12d3-a456-426614174000');

// Password strength
const strongPassword = isStrongPassword('MyP@ssw0rd123');
```

### Array Utilities

```typescript
import { 
  chunk,
  unique,
  shuffle,
  groupBy,
  sortBy 
} from '@common/utilities';

// Chunk array into smaller arrays
const chunks = chunk([1, 2, 3, 4, 5, 6], 2);
// Output: [[1, 2], [3, 4], [5, 6]]

// Get unique values
const uniqueValues = unique([1, 2, 2, 3, 3, 4]);
// Output: [1, 2, 3, 4]

// Shuffle array
const shuffled = shuffle([1, 2, 3, 4, 5]);

// Group by property
const grouped = groupBy(users, 'role');

// Sort by property
const sorted = sortBy(users, 'createdAt', 'desc');
```

### Object Utilities

```typescript
import { 
  deepClone,
  deepMerge,
  pick,
  omit,
  isEqual 
} from '@common/utilities';

// Deep clone object
const cloned = deepClone(originalObject);

// Deep merge objects
const merged = deepMerge(obj1, obj2, obj3);

// Pick specific properties
const subset = pick(user, ['id', 'name', 'email']);

// Omit properties
const filtered = omit(user, ['password', 'refreshToken']);

// Deep equality check
const areEqual = isEqual(obj1, obj2);
```

## Available Utilities

### crypto.utility.ts

- `hashPassword(password: string): Promise<string>`
- `comparePassword(password: string, hash: string): Promise<boolean>`
- `generateToken(length: number): string`
- `encrypt(text: string, key: string): string`
- `decrypt(encrypted: string, key: string): string`
- `generateRandomBytes(length: number): Buffer`
- `createHash(data: string, algorithm?: string): string`

### otp.utility.ts

- `generateOTP(length: number): string`
- `createOTPHash(otp: string): string`
- `validateOTP(otp: string, hash: string): boolean`
- `generateTOTP(secret: string): string`
- `verifyTOTP(token: string, secret: string): boolean`

### time.utility.ts

- `formatDate(date: Date, format: string): string`
- `addDays(date: Date, days: number): Date`
- `addHours(date: Date, hours: number): Date`
- `addMinutes(date: Date, minutes: number): Date`
- `isExpired(date: Date): boolean`
- `getTimeDifference(start: Date, end: Date): TimeDifference`
- `convertToTimezone(date: Date, timezone: string): Date`
- `getStartOfDay(date: Date): Date`
- `getEndOfDay(date: Date): Date`

## Configuration

Some utilities require environment variables:

```env
# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# Hashing
BCRYPT_ROUNDS=10

# TOTP
TOTP_WINDOW=1
```

## File Structure

```text
src/
├── index.ts              # Main exports
├── crypto.utility.ts     # Cryptographic functions
├── otp.utility.ts        # OTP generation and validation
├── time.utility.ts       # Date/time utilities
├── string.utility.ts     # String manipulation
├── validation.utility.ts # Validation helpers
├── array.utility.ts      # Array utilities
└── object.utility.ts     # Object utilities
```

## Best Practices

1. **Immutability**: Utility functions should not modify input parameters
2. **Pure Functions**: Prefer pure functions without side effects
3. **Error Handling**: Handle errors gracefully and throw descriptive errors
4. **Type Safety**: Use TypeScript for type checking
5. **Testing**: Write comprehensive unit tests for all utilities
6. **Documentation**: Document complex utility functions with JSDoc
7. **Performance**: Optimize for performance when dealing with large datasets

## Testing

```bash
pnpm run test
```

## Contributing

When adding new utilities:

1. Place them in the appropriate file or create a new utility file
2. Add comprehensive tests
3. Document with JSDoc comments
4. Export from `index.ts`
5. Update this README

Follow the monorepo's coding standards and ensure all tests pass before submitting changes.
