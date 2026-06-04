# Quality Gates Configuration

This document outlines the quality gates and standards enforced in this project.

## ESLint Quality Rules

### TypeScript Rules

| Rule                            | Severity | Description                              |
| ------------------------------- | -------- | ---------------------------------------- |
| `no-explicit-any`               | Error    | Prevents usage of `any` type             |
| `explicit-function-return-type` | Warn     | Requires explicit return types (backend) |
| `no-unused-vars`                | Error    | Flags unused variables                   |
| `consistent-type-imports`       | Error    | Enforces `type` imports                  |
| `no-floating-promises`          | Error    | Requires handling promises               |

### Code Quality (SonarJS)

| Rule                    | Threshold | Description                                  |
| ----------------------- | --------- | -------------------------------------------- |
| `cognitive-complexity`  | 15        | Maximum cognitive complexity per function    |
| `no-duplicate-string`   | 3         | Maximum duplicate strings before extraction  |
| `no-identical-functions`| Warn      | Flags identical function bodies              |

### Import Organization

- Groups: builtin → external → internal → parent/sibling → index → type
- Alphabetical ordering within groups
- No duplicate imports

## Test Coverage Thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Branches   | 80%     |
| Functions  | 80%     |
| Lines      | 80%     |
| Statements | 80%     |

## SonarCloud Quality Gate

Default "Sonar way" quality gate requires:

### On New Code (PRs)

| Metric                      | Condition |
| --------------------------- | --------- |
| Coverage                    | ≥ 80%     |
| Duplicated Lines            | ≤ 3%      |
| Maintainability Rating      | A         |
| Reliability Rating          | A         |
| Security Rating             | A         |
| Security Hotspots Reviewed  | 100%      |

### Overall Code

| Metric                 | Condition |
| ---------------------- | --------- |
| Coverage               | ≥ 80%     |
| Duplicated Lines       | ≤ 3%      |
| Maintainability Rating | A         |
| Reliability Rating     | A         |
| Security Rating        | A         |

## Commit Message Convention

Format: `type(scope): description`

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `build`: Build system changes
- `ci`: CI configuration
- `chore`: Maintenance tasks
- `revert`: Reverting changes

### Scopes

All package names are valid scopes:

- Backend: `api-gateway`, `customer-api`, `admin-api`, `schedule-api`
- Frontend: `customer-web`, `admin-web`, `customer-mobile`
- Common: `database`, `cache`, `config`, `email`, `export`, `logging`, `metrics`, `queue`, `storage`, `types`, `utilities`
- Meta: `deps`, `ci`, `docs`, `release`

## Pre-commit Checks

Automated via Husky + lint-staged:

1. **Staged TypeScript/JavaScript files:**
   - ESLint with auto-fix
   - Prettier formatting
   - Must pass with zero warnings

2. **Commit message:**
   - Must follow conventional commit format
   - Type must be from allowed list
   - Subject must be lowercase

3. **Pre-push:**
   - Changeset status check (warns if no changeset)
