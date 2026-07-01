---
description: "Write unit and/or integration tests for an existing service, controller, or route group"
agent: "testing"
argument-hint: "What to test, e.g. 'unit tests for ProductsService' or 'integration tests for order routes'"
---

Write tests for:

**Request:** {{ input }}

Follow `testing.md` exactly: factories in `tests/factories/`, mocked-dependency unit tests in `tests/unit/`, real-test-database integration tests in `tests/integration/`. Cover cache hit/miss, not-found, and idempotency paths on services; 401/403/400/404/happy-path on routes. Confirm coverage thresholds (branches 75%, functions/lines/statements 80%) are still met after adding tests.
