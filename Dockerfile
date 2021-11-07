FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get autoremove -y && \
    apt-get autoclean

RUN apt-get -y install nodejs npm && \
    npm i -g npm@latest && \
    npm i -g n@latest && \
    n 14 && \
    npm i -g npm@latest

RUN apt-get install -y openssl

WORKDIR /app

COPY ./config.cnf /app/
COPY ./docker-entrypoint.sh /app/

RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

CMD []
