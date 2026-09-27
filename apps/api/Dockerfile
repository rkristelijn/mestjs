# KEUR-EXPECT: KEUR-IAC-002 KEUR-IAC-003 SCA-050
# KEUR-CATEGORY: security supply-chain
# KEUR-NOTE: self-authored (mestjs) — no non-root USER, no HEALTHCHECK, COPY --from untrusted image. Verified `keur scan` 2026-09-26.
# mestjs API (NestJS) — deliberately-vulnerable target, containerised for
# isolated exploit practice ("dasten"). DO NOT deploy this publicly.
#
# Version matrix: the base image is pinned to a Node patch that STILL CONTAINS a
# known, testable CVE (one patch below the fix). Pick the version with
# --build-arg NODE_VERSION=<x> or via the docker-compose services.
#
#   NODE_VERSION | base tag           | fixed in  | testable CVE
#   -------------|--------------------|-----------|--------------------------------
#   20.19.1      | node:20.19.1       | 20.19.2   | CVE-2025-23167 HTTP req smuggling
#   22.17.0      | node:22.17.0       | 22.17.1   | CVE-2025-27210 path traversal (win)
#   24.4.0       | node:24.4.0        | 24.4.1    | CVE-2025-27209 HashDoS in V8
#   26.0.0       | node:26.0.0        | (recent)  | CVE-2026-48618 TLS wildcard bypass
#
# These are RUNTIME vulnerabilities in Node itself — separate from the
# deliberately-insecure mestjs app code. Both are here on purpose for practice.

ARG NODE_VERSION=20.19.1

# ---- build stage -----------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm AS build
WORKDIR /app

# Native build deps for better-sqlite3 (node-gyp: python + make + g++).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# node-gyp normally downloads the matching Node headers over HTTPS. Behind a
# TLS-inspecting corporate proxy that fails with SELF_SIGNED_CERT_IN_CHAIN.
# The official node image already ships the headers locally, so point node-gyp
# at them and skip the download entirely (no proxy/cert dependency).
ENV npm_config_nodedir=/usr/local

# Install deps first (layer cache). Root package.json uses --legacy-peer-deps.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy the workspace and build only the api project.
COPY . .
RUN npx nx build api --configuration=production

# ---- runtime stage ---------------------------------------------------------
# Keep the SAME vulnerable Node version at runtime (that is the whole point).
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Nx emits a self-contained bundle + its own package.json into dist/apps/api.
COPY --from=build /app/dist/apps/api ./
# Install only the pruned production deps (rebuilds better-sqlite3 for slim).
# Use the image's local Node headers (skip node-gyp's HTTPS download; avoids
# SELF_SIGNED_CERT_IN_CHAIN behind a TLS-inspecting proxy).
ENV npm_config_nodedir=/usr/local
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install --omit=dev --legacy-peer-deps \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
CMD ["node", "main.js"]