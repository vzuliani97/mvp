FROM node:24-alpine AS base

WORKDIR /app

COPY package*.json ./


FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY src ./src

USER node

EXPOSE 3000

CMD ["npm", "start"]