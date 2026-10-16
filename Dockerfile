FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV HUB_ALLOW_LOCAL_DEV=true
ENV PORT=8080
ENV HUB_LEDGER_PATH=/data/hub-ledger.json
ENV HUB_SESSION_KEY_PATH=/data/hub-session.key

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
