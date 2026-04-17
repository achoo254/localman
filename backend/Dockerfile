# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: production runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile 2>/dev/null || npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
