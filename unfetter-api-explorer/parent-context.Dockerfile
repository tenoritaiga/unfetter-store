FROM node:10.1-alpine

ARG https_proxy_url

LABEL maintainer "unfetter"
LABEL Description="Create swagger documention"

# Create Application Directory
ENV WORKING_DIRECTORY /usr/share/unfetter-api-explorer
RUN mkdir -p $WORKING_DIRECTORY
WORKDIR $WORKING_DIRECTORY

COPY unfetter-api-explorer/docker/set-linux-repo.sh $WORKING_DIRECTORY
COPY unfetter-api-explorer/docker/set-npm-repo.sh $WORKING_DIRECTORY
RUN chmod 700 $WORKING_DIRECTORY/*.sh
RUN $WORKING_DIRECTORY/set-linux-repo.sh
RUN $WORKING_DIRECTORY/set-npm-repo.sh

# Copy Swagger files from Discover API
RUN mkdir -p $WORKING_DIRECTORY/../unfetter-discover-api
RUN mkdir -p $WORKING_DIRECTORY/../unfetter-discover-api/api
RUN mkdir -p $WORKING_DIRECTORY/../unfetter-discover-api/api/swagger
COPY unfetter-discover-api/multifile-remote.yaml $WORKING_DIRECTORY/../unfetter-discover-api
COPY unfetter-discover-api/api/swagger $WORKING_DIRECTORY/../unfetter-discover-api/api/swagger

# Install Dependencies
# COPY package-lock.json $WORKING_DIRECTORY
COPY unfetter-api-explorer/package.json $WORKING_DIRECTORY

RUN if [ "x$https_proxy_url" = "x" ] ; then echo No proxy applied ; else npm config --global set proxy $https_proxy_url ; fi
RUN if [ "x$https_proxy_url" = "x" ] ; then echo No https_proxy applied ; else npm config --global set https_proxy $https_proxy_url ; fi

RUN npm i -g http-server && find / -name "cb-never*.tgz" -delete

# The NPM package depends on TAR package, which has a test directory with an encrypted tgz file, that gets blocked by some antivirus scanners. Removing it.
RUN npm --loglevel error install && \
    find / -name "cb-never*.tgz" -delete && \
    rm -rf /usr/share/man && \
    rm -rf /tmp/*  && \
    rm -rf /var/cache/apk/* && \
    rm -rf /usr/lib/node_modules/npm/man && \
    rm -rf /usr/lib/node_modules/npm/doc && \
    rm -rf /usr/lib/node_modules/npm/html

# Run as non-root
RUN addgroup -g 30000 -S appuser && \
adduser -u 30000 -S appuser -G appuser

COPY ./unfetter-api-explorer $WORKING_DIRECTORY

RUN chown -R 30000:30000 $WORKING_DIRECTORY

USER 30000
