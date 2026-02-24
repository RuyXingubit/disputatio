# ─── Stage 1: Dependências ─────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# ─── Stage 2: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copia deps instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera Prisma Client
RUN npx prisma generate

# Build Next.js em modo standalone (menor imagem final)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Runner (imagem final, mínima) ─────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário sem privilégios por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia apenas o necessário do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia schema Prisma para migrações em runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Instala o Prisma globalmente para poder rodar as migrações no startup sem depender do node_modules local
RUN npm install -g prisma@6

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "prisma db push --skip-generate && node server.js"]
