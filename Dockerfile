FROM node:18-bookworm-slim as builder

ENV TIMEZONE=Europe/Paris \
  LANGUAGE=fr_FR.UTF-8 \
  LANG=fr_FR.UTF-8 \
  TERM=xterm \
  DEBIAN_FRONTEND=noninteractive

WORKDIR /data

COPY . .

RUN yarn install \
  --prefer-offline \
  --frozen-lockfile \
  --non-interactive \
  --production=false

RUN yarn run build

FROM node:18-bookworm-slim as production

ENV TIMEZONE=Europe/Paris \
  LANGUAGE=fr_FR.UTF-8 \
  LANG=fr_FR.UTF-8 \
  TERM=xterm \
  DEBIAN_FRONTEND=noninteractive

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /data

ADD package.json .
ADD *.lock .

RUN apt clean -y \
  && apt update -y \
  && apt upgrade -y \
  && apt install -y locales \
  && export LANGUAGE=${LANGUAGE} \
  && export LANG=${LANG} \
  && export LC_ALL=${LC_ALL} \
  && locale-gen ${LANG} \
  && dpkg-reconfigure --frontend ${DEBIAN_FRONTEND} locales \
  && apt install --no-install-recommends -yq \
  procps \
  git \
  jq \
  nano \
  openssl

RUN yarn install \
  --prefer-offline \
  --pure-lockfile \
  --non-interactive \
  --production=true
# && yarn cache clean \
# && yarn autoclean --init \
# && yarn autoclean --force

COPY --from=builder /data/dist ./dist

CMD ["yarn", "run", "start:prod"]
