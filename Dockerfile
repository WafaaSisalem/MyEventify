FROM node:24-slim AS build

WORKDIR /app

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npx prisma generate && npm run build


FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]