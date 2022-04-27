FROM node:16-alpine as build
WORKDIR /app

RUN npm i -g npm@latest
COPY package*.json /app/
RUN npm i
COPY . /app
RUN npm run build

FROM node:16-alpine
WORKDIR /app

COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod
COPY --from=build /app/dist /app/dist

WORKDIR /mountpoint

CMD [ "node", "/app/dist/index.js", "-f", "/mountpoint" ]
