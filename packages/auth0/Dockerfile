FROM node:14.17.1

ENV NODE_ENV=production
ENV npm_config_yes=true

WORKDIR /simulacrum

RUN npm i -g npm@8.4.1

COPY ./docker-package.json ./package.json

COPY ./simulator-server.mjs .

RUN npm install

CMD ["npm", "start"]