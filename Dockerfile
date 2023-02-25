FROM node:14

WORKDIR /usr/src/app

RUN apt-get update -y
RUN npm set registry https://npm.pantherx.org/

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"
RUN npm install --global pnpm