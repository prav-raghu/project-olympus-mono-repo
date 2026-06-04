---
name: External API Agent
description: >
  Use when adding a new external HTTP client integration to common/external-apis/. This package
  is the single home for all HTTP clients that call external organisation APIs. Each integration
  is a self-contained NestJS module following the forRootAsync pattern, fully injectable and
  mockable in unit tests.
tools:
  - read
  - edit
  - search
user-invocable: false
---

# External API Agent

## Package Location

`common/external-apis/` — package name `@project-olympus/external-apis`

## When to use this agent

Invoke this agent whenever a developer needs to call an external organisation API from more than
one backend service. Single-service integrations may live in the service itself.

## Internal Folder Structure

```
common/external-apis/
  src/
    <integration-name>/
      <integration-name>.module.ts       ← NestJS module with forRootAsync
      <integration-name>.service.ts      ← @Injectable() HTTP client
      interfaces/
        <integration-name>-config.interface.ts
        <integration-name>-request.interface.ts
        <integration-name>-response.interface.ts
      constants/
        <integration-name>.constants.ts  ← injection token
    index.ts                             ← barrel
```

## Module Pattern — forRootAsync (mandatory)

```typescript
import { Module, type DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrgBillingApiService } from './org-billing-api.service';
import { ORG_BILLING_API_CONFIG } from './constants/org-billing-api.constants';
import type { OrgBillingApiConfig } from './interfaces/org-billing-api-config.interface';

@Module({})
export class OrgBillingApiModule {
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => OrgBillingApiConfig | Promise<OrgBillingApiConfig>;
    inject?: unknown[];
  }): DynamicModule {
    return {
      module: OrgBillingApiModule,
      imports: [
        HttpModule.registerAsync({
          useFactory: (config: OrgBillingApiConfig) => ({
            timeout: config.timeoutMs,
            maxRedirects: 3,
          }),
          inject: [ORG_BILLING_API_CONFIG],
        }),
      ],
      providers: [
        {
          provide: ORG_BILLING_API_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        OrgBillingApiService,
      ],
      exports: [OrgBillingApiService],
    };
  }
}
```

## Service Pattern

```typescript
import { Injectable, Inject, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ORG_BILLING_API_CONFIG } from './constants/org-billing-api.constants';
import type { OrgBillingApiConfig } from './interfaces/org-billing-api-config.interface';
import type { GetInvoiceResponse } from './interfaces/org-billing-api-response.interface';

@Injectable()
export class OrgBillingApiService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(ORG_BILLING_API_CONFIG) private readonly config: OrgBillingApiConfig,
  ) {}

  public async getInvoice(invoiceId: string): Promise<GetInvoiceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GetInvoiceResponse>(
          `${this.config.baseUrl}/invoices/${invoiceId}`,
          { headers: { Authorization: `Bearer ${this.config.apiKey}` } },
        ),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new BadGatewayException(
          `OrgBillingApi call failed: ${error.response?.status ?? 'unknown'}`,
        );
      }
      throw error;
    }
  }
}
```

## Constants Pattern

```typescript
export const ORG_BILLING_API_CONFIG = Symbol('ORG_BILLING_API_CONFIG');
```

## Config Interface Pattern

```typescript
export interface OrgBillingApiConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}
```

## Consuming in a Backend Service

```typescript
import { OrgBillingApiModule } from '@project-olympus/external-apis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    OrgBillingApiModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        baseUrl: config.getOrThrow('ORG_BILLING_API_BASE_URL'),
        apiKey: config.getOrThrow('ORG_BILLING_API_KEY'),
        timeoutMs: 5000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Unit Testing Pattern

Mock the service class directly — never use HTTP interceptors in unit tests:

```typescript
const module = await Test.createTestingModule({
  providers: [
    SomeService,
    {
      provide: OrgBillingApiService,
      useValue: {
        getInvoice: jest.fn().mockResolvedValue({ id: 'inv-001', amount: 500 }),
      },
    },
  ],
}).compile();
```

## New Integration Checklist

1. Create `src/<integration-name>/` folder
2. Create `<integration-name>.module.ts` — forRootAsync pattern
3. Create `<integration-name>.service.ts` — injectable HTTP client with error translation
4. Create `interfaces/<integration-name>-config.interface.ts`
5. Create `interfaces/<integration-name>-request.interface.ts`
6. Create `interfaces/<integration-name>-response.interface.ts`
7. Create `constants/<integration-name>.constants.ts` — injection token
8. Export all from `index.ts`
9. Add env variables to root `.env.example` and per-service `.env.example`
10. Write unit tests in `tests/unit/<integration-name>.service.spec.ts`
