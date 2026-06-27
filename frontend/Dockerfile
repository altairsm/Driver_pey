FROM node:20-alpine AS build

ARG COMMIT_HASH=DEV

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV COMMIT_HASH=$COMMIT_HASH
RUN npm run build
RUN echo "{\"commit\":\"$COMMIT_HASH\",\"url_download\":\"\"}" > dist/version.json

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
