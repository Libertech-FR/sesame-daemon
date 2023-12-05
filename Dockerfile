FROM node:18-bookworm-slim as builder

WORKDIR /data

COPY . .

RUN yarn install \
  --prefer-offline \
  --frozen-lockfile \
  --non-interactive \
  --production=false

RUN yarn run build

FROM node:18-bookworm-slim as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /data

ADD package.json .
ADD *.lock .

RUN yarn install \
  --prefer-offline \
  --pure-lockfile \
  --non-interactive \
  --production=true \
  && yarn cache clean \
  && yarn autoclean --init \
  && yarn autoclean --force

COPY --from=builder /data/dist ./dist

CMD ["yarn", "start:prod"]
