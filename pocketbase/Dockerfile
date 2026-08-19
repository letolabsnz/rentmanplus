FROM alpine:latest
ARG PB_VERSION=0.39.11
# BuildKit sets this automatically (amd64/arm64) to match the build platform —
# matters here since PocketBase ships separate binaries per arch and this
# gets built natively on both Apple Silicon dev machines and amd64 servers.
ARG TARGETARCH

RUN apk add --no-cache unzip ca-certificates \
    && wget "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh
RUN chmod +x /pb/docker-entrypoint.sh /pb/pocketbase

WORKDIR /pb
EXPOSE 8080
ENTRYPOINT ["/pb/docker-entrypoint.sh"]
