FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @project-olympus/database prisma:generate
RUN pnpm --filter "@project-olympus/api-gateway..." build
RUN pnpm deploy --filter @project-olympus/api-gateway --prod /prod/api-gateway

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY --from=builder --chown=nodeusr:nodegrp /prod/api-gateway .
COPY --from=builder --chown=nodeusr:nodegrp /app/node_modules/.prisma ./node_modules/.prisma
USER nodeusr
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/main.js"]
