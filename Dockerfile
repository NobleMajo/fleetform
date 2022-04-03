FROM node:16-alpine as build

WORKDIR /app

RUN npm i -g npm@latest
COPY package*.json /app/
RUN npm i
COPY . /app
RUN npm run build

FROM node:16-alpine

RUN npm i -g npm@latest
WORKDIR /app
COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod && \
    mkdir /mountpoint && \
    echo -n "#!/bin/bash\n\nnode /app/dist/index.js $@\n" >> /usr/local/bin/ff
COPY --from=build /app/dist /app/dist

WORKDIR /mountpoint

CMD [ "node", "/app/dist/bin.js", "-f", "/mountpoint" ]
