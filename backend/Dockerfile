FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ARG COMMIT_HASH=unknown
ARG VERSION=unknown
RUN echo -n "$COMMIT_HASH" > /app/.commit
RUN echo -n "$VERSION" > /app/.version

EXPOSE 3001

CMD ["node", "src/app.js"]
