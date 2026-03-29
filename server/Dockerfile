FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci

COPY server/ ./server/

RUN cd server && npm run build

FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/server/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./dist
COPY server/package.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
