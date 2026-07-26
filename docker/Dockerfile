# Multi-stage Docker build for Universal File Toolkit

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/cli/package.json ./packages/cli/
RUN pnpm install --frozen-lockfile || pnpm install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production runner image
FROM node:20-alpine AS runner
WORKDIR /app

# Install system dependencies (FFmpeg, LibreOffice, Tesseract OCR, Ghostscript)
RUN apk add --no-checked \
    ffmpeg \
    libreoffice \
    tesseract-ocr \
    ghostscript \
    qpdf

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app ./

EXPOSE 3000 3001

CMD ["node", "packages/backend/dist/index.js"]
