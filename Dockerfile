# Multi-stage Dockerfile for Maspero Services System
# Optimized for DigitalOcean (2GB RAM droplet)
# Port: 3007 (3000=OpenGym, 3001=Mazaya, 3006=RTX, 3007=Maspero)

# syntax=docker/dockerfile:1.7

# 1. Base
FROM node:20-alpine AS base
WORKDIR /app

# 2. Dependencies
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm ci

# 3. Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1280"
RUN npx prisma generate && npm run build

# 4. Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3007
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs ; adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3007

CMD ["node", "server.js"]
