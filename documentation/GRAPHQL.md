# GraphQL

GraphQL support via the api-gateway is available when needed. The api-gateway can act as a GraphQL federation layer over the NestJS backend services.

## Implementation approach

Use `@nestjs/graphql` with `@nestjs/apollo` for code-first schema generation:

```bash
pnpm --filter @project-olympus/api-gateway add @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

## NestJS GraphQL module

```typescript
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

## Angular client

Use `apollo-angular` with MSAL interceptor for authenticated GraphQL queries:

```typescript
import { Apollo } from 'apollo-angular';
import { gql } from '@apollo/client/core';

@Injectable({ providedIn: 'root' })
export class UsersGqlService {
  constructor(private readonly apollo: Apollo) {}

  public getUsers() {
    return this.apollo.query({ query: gql`{ users { id email } }` });
  }
}
```
