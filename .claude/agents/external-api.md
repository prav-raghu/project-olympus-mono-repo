---
name: external-api
description: Use when adding a new external HTTP client integration to common/external-apis/. This package is the single home for all HTTP clients that call external organisation APIs. Each integration is a self-contained NestJS module following the forRootAsync pattern, fully injectable and mockable in unit tests.
tools: Read, Edit, Write, Grep, Glob
model: inherit
---

## Package location

`common/external-apis/` — package name `@project-olympus/external-apis`

## When to use this agent

Invoke whenever a developer needs to call an external organisation API from more than one backend service. Single-service integrations may live in the service itself.

## Internal folder structure

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

## Module pattern — forRootAsync (mandatory)

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
          useFactory: (config: OrgBillingApiConfig) => ({ timeout: config.timeoutMs, maxRedirects: 3 }),
          inject: [ORG_BILLING_API_CONFIG],
        }),
      ],
      providers: [
        { provide: ORG_BILLING_API_CONFIG, useFactory: options.useFactory, inject: options.inject ?? [] },
        OrgBillingApiService,
      ],
      exports: [OrgBillingApiService],
    };
  }
}
```

## Service pattern

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
        this.httpService.get<GetInvoiceResponse>(`${this.config.baseUrl}/invoices/${invoiceId}`, {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new BadGatewayException(`OrgBillingApi call failed: ${error.response?.status ?? 'unknown'}`);
      }
      throw error;
    }
  }
}
```

## Constants and config interface

```typescript
export const ORG_BILLING_API_CONFIG = Symbol('ORG_BILLING_API_CONFIG');

export interface OrgBillingApiConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}
```

## Consuming in a backend service

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

## Unit testing pattern

Mock the service class directly — never use HTTP interceptors in unit tests:

```typescript
const module = await Test.createTestingModule({
  providers: [
    SomeService,
    { provide: OrgBillingApiService, useValue: { getInvoice: jest.fn().mockResolvedValue({ id: 'inv-001', amount: 500 }) } },
  ],
}).compile();
```

## New integration checklist

1. Create `src/<integration-name>/` folder
2. Create `<integration-name>.module.ts` — `forRootAsync` pattern
3. Create `<integration-name>.service.ts` — injectable HTTP client with error translation
4. Create `interfaces/<integration-name>-config.interface.ts`, `-request.interface.ts`, `-response.interface.ts`
5. Create `constants/<integration-name>.constants.ts` — injection token
6. Export all from `index.ts`
7. Add env variables to the root `.env.example` and the per-service `.env.example`
8. Write unit tests in `tests/unit/<integration-name>.service.spec.ts`
