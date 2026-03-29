FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --only=production

COPY server/ ./server/

RUN cd server && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
