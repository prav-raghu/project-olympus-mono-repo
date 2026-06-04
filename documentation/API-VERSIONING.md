# API Versioning Strategy

## Overview

This monorepo implements a comprehensive API versioning strategy across all backend services (customer-api, admin-api, schedule-api) to ensure backward compatibility and smooth migration paths.

## Version Detection Methods

The API version can be specified in three ways (in order of precedence):

### 1. Custom Header (Recommended)
```bash
curl -H "API-Version: v2" https://api.example.com/users
```

### 2. Accept Header
```bash
curl -H "Accept: application/vnd.api.v2+json" https://api.example.com/users
```

### 3. URL Path (Most Common)
```bash
curl https://api.example.com/api/v2/users
```

## Response Headers

All API responses include version information:

```
X-API-Version: v2
```

For deprecated versions:
```
Deprecation: true
Sunset: 2026-12-31
X-API-Deprecation-Info: v1 will be deprecated on 2026-12-31. Please migrate to v2.
```

## Current Version Status

- **v1**: Currently supported, **deprecated** (sunset: 2026-12-31)
- **v2**: Current stable version ✅

## Usage Examples

### Frontend Integration

#### Axios Configuration
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'API-Version': 'v2',
  },
});

apiClient.interceptors.response.use(
  (response) => {
    const version = response.headers['x-api-version'];
    const isDeprecated = response.headers['deprecation'] === 'true';
    
    if (isDeprecated) {
      console.warn(
        `API version ${version} is deprecated. ` +
        `Sunset date: ${response.headers['sunset']}. ` +
        `Info: ${response.headers['x-api-deprecation-info']}`
      );
    }
    
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

#### URL-Based Versioning
```typescript
const response = await fetch('/api/v2/users');
```

### Backend Service URLs

- **Customer API v1**: `http://localhost:3001/api/v1/`
- **Customer API v2**: `http://localhost:3001/api/v2/`
- **Admin API v1**: `http://localhost:3002/api/v1/`
- **Admin API v2**: `http://localhost:3002/api/v2/`
- **Schedule API v1**: `http://localhost:3003/api/v1/`
- **Schedule API v2**: `http://localhost:3003/api/v2/`

## Version Management

### ApiVersionManager Utility

Located in `common/utilities/src/apiVersioning.ts`:

```typescript
import { apiVersionManager } from '@project-olympus/utilities';

apiVersionManager.isVersionSupported('v2');
apiVersionManager.getCurrentVersion();
apiVersionManager.getSupportedVersions();
apiVersionManager.getDeprecatedVersions();
```

### Adding a New Version

1. **Update API_VERSION_CONFIG** in each service's `plugins/api-version.plugin.ts`:

```typescript
const API_VERSION_CONFIG: ApiVersionConfig = {
  currentVersion: 'v2',
  supportedVersions: ['v1', 'v2', 'v3'],
  deprecatedVersions: new Map([
    ['v1', { sunset: '2026-12-31', message: 'v1 deprecated' }],
    ['v2', { sunset: '2027-06-30', message: 'v2 deprecated' }],
  ]),
};
```

2. **Create v3 routes directory**:
```
apps/backend/customer-api/src/routes/v3/
└── v3.route.ts
```

3. **Register v3 routes** in `application.ts`:
```typescript
this.app.register(
  async (v3) => {
    await new V3Routes(v3).register();
  },
  { prefix: 'api/v3/' },
);
```

4. **Update ApiVersionManager** in `common/utilities/src/apiVersioning.ts`:
```typescript
this.supportedVersions = new Map([
  ['v1', { version: 'v1', isDeprecated: true, sunsetDate: '2026-12-31', isCurrent: false }],
  ['v2', { version: 'v2', isDeprecated: true, sunsetDate: '2027-06-30', isCurrent: false }],
  ['v3', { version: 'v3', isDeprecated: false, isCurrent: true }],
]);
```

## Error Handling

### Unsupported Version
```json
{
  "success": false,
  "error": "Unsupported API version",
  "supportedVersions": ["v1", "v2"]
}
```
Status: `400 Bad Request`

## Best Practices

1. **Never break v1 routes** - Keep backward compatibility
2. **Gradual migration** - Give clients 6-12 months notice before deprecation
3. **Monitor usage** - Track which versions are being used
4. **Document changes** - Maintain changelog for each version
5. **Use semantic versioning** - Major version for breaking changes

## Migration Guide

### From v1 to v2

#### Breaking Changes
- TBD based on actual implementation

#### Deprecated Endpoints
- None yet

#### New Features in v2
- Enhanced error handling
- Improved response formats
- Additional validation

### Migration Checklist
- [ ] Review API changelog
- [ ] Update client code to use v2 endpoints
- [ ] Update API-Version header or URL prefix
- [ ] Test all endpoints
- [ ] Monitor for deprecation warnings
- [ ] Remove v1 references before sunset date

## Testing

### Test Version Detection
```bash
# Test header-based
curl -H "API-Version: v2" http://localhost:3001/api/v1/health

# Test URL-based
curl http://localhost:3001/api/v2/health

# Test invalid version
curl -H "API-Version: v99" http://localhost:3001/api/v1/health
```

### Verify Deprecation Headers
```bash
curl -v http://localhost:3001/api/v1/health | grep -i deprecation
```

## Configuration

All versioning configuration is centralized per service in:
```
apps/backend/<service>/src/plugins/api-version.plugin.ts
```

## Architecture

```
Request → API Version Plugin → Version Detection → Route Resolution
                                        ↓
                            Set Response Headers
                                        ↓
                            Check Deprecation
                                        ↓
                            Execute Handler
```

## Monitoring & Analytics

Consider tracking:
- Version usage distribution
- Deprecated version usage
- Version migration progress
- Error rates per version

Implement logging in your analytics service to track these metrics.
