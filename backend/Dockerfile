FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ARG COMMIT_HASH=unknown
RUN echo -n "$COMMIT_HASH" > /app/.commit

EXPOSE 3001

CMD ["node", "src/app.js"]
