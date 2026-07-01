#!/usr/bin/env bash
# Checks edited TypeScript files for `any` type usage.
# Excludes legitimate exceptions: type comments, eslint-disable, and test mock patterns.
# Non-zero exit surfaces the violation back to Claude.

set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')

if [[ -z "$file_path" ]]; then
  exit 0
fi

if [[ "$file_path" != *.ts && "$file_path" != *.tsx ]]; then
  exit 0
fi

if [[ "$file_path" == *"/dist/"* || "$file_path" == *"/node_modules/"* ]]; then
  exit 0
fi

if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Look for `: any` or `as any` patterns — skip comment lines and eslint-disable
violations=$(grep -n '\(: any\b\|as any\b\| any\[\]\)' "$file_path" \
  | grep -v '^\s*//' \
  | grep -v 'eslint-disable' \
  | grep -v '// any' \
  || true)

if [[ -n "$violations" ]]; then
  echo "Found 'any' type usage in $file_path — fix the type before continuing:" >&2
  echo "$violations" >&2
  exit 2
fi

exit 0
