# Backend Dockerfile - NestJS
FROM node:20-alpine AS builder

WORKDIR /app

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Generar cliente Prisma
RUN pnpm prisma generate

# Build
RUN pnpm build

# === Production Stage ===
FROM node:20-alpine

WORKDIR /app

# Instalar yt-dlp y ffmpeg para descarga de videos
RUN apk add --no-cache ffmpeg python3 && \
    wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.seed.json ./

# Exponer puerto
EXPOSE 3001

# Comando de inicio: migrar, seed y ejecutar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
