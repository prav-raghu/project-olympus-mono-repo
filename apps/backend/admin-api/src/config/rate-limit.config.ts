export const RateLimitConfig = {
  global: { ttl: 60_000, limit: 200 },
  auth: { ttl: 60_000, limit: 10 },
  sensitiveEndpoints: { ttl: 60_000, limit: 5 },
  adminOperations: { ttl: 60_000, limit: 100 },
};
