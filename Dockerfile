FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /bin/

ENV TIMEZONE=Europe/Paris \
  LANGUAGE=fr_FR.UTF-8 \
  LANG=fr_FR.UTF-8 \
  TERM=xterm \
  DEBIAN_FRONTEND=noninteractive \
  PYTHONUNBUFFERED=1 \
  UV_COMPILE_BYTECODE=1 \
  UV_LINK_MODE=copy \
  # Hors de /data pour que le montage du code en dev ne masque pas l'environnement
  UV_PROJECT_ENVIRONMENT=/opt/venv \
  PATH=/opt/venv/bin:$PATH

ARG SESAME_ENV=production
ENV SESAME_ENV=${SESAME_ENV}

WORKDIR /data

RUN apt clean -y \
  && apt update -y \
  && apt install -y locales \
  && sed -i "/${LANG}/s/^# //" /etc/locale.gen \
  && locale-gen ${LANG} \
  && dpkg-reconfigure --frontend ${DEBIAN_FRONTEND} locales \
  && apt install --no-install-recommends -yq \
  binutils \
  procps \
  git \
  jq \
  nano \
  openssl \
  python3 \
  python3-paramiko \
  python3-jinja2 \
  python3-ldap \
  && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY . .
RUN uv sync --frozen

CMD ["sesame-daemon"]
