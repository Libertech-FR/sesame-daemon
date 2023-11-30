FROM debian:12
LABEL description="Libertech Dev" \
      maintainer="Libertech <aide@libertech.fr>" \
      vendor=Libertech \
      name="sesam-daemon-dev"

ENV TIMEZONE=Europe/Paris \
    LANGUAGE=fr_FR.UTF-8 \
    LANG=fr_FR.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    TERM=xterm 

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
    procps nodejs npm yarn supervisor 

RUN npm i -g @nestjs/cli

RUN npm i -g yarn  
WORKDIR /data
COPY ./rootfs /

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]


