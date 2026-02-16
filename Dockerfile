# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build:client
RUN npm run build:server

# Runtime stage
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/server/index.js"]
