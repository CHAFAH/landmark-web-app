# Frontend build
FROM node:18-slim AS frontend
WORKDIR /app
COPY package.json .
RUN npm install
COPY public ./public
COPY src ./src
RUN npm run build

# Server
FROM node:18-slim
WORKDIR /app
COPY server/package.json .
RUN npm install
COPY server/index.js .
COPY --from=frontend /app/build ./public
EXPOSE 5000
CMD ["node", "index.js"]
