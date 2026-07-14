#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/env.js
window.__env = {
  apiBaseUrl: "${API_BASE_URL:-/api/v1}",
  azureClientId: "${AZURE_CLIENT_ID:-}",
  azureAuthority: "${AZURE_AUTHORITY:-}",
  azureRedirectUri: "${AZURE_REDIRECT_URI:-/}"
};
EOF

exec nginx -g "daemon off;"
