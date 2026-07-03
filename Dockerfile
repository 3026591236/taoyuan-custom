FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=80
COPY server.js ./server.js
COPY --from=builder /app/docs ./docs
VOLUME ["/data"]
EXPOSE 80
CMD ["node", "server.js"]
