FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist_seed --esModuleInterop --module commonjs --target ES2021 --skipLibCheck --resolveJsonModule && \
    cp dist_seed/seed.js dist/seed.js

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
RUN npx prisma generate
EXPOSE 4000
# cache-bust: 2024-03-30
CMD ["node", "dist/main"]
