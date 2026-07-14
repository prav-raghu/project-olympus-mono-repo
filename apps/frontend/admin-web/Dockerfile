FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY common/ ./common/
COPY apps/frontend/admin-web/ ./apps/frontend/admin-web/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "admin-web..." build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/admin-web/dist/admin-web/browser /usr/share/nginx/html
COPY apps/frontend/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
