# KEUR-EXPECT: KEUR-IAC-002 KEUR-IAC-003 SCA-050
# KEUR-CATEGORY: security supply-chain
# KEUR-NOTE: self-authored (mestjs) — no non-root USER, no HEALTHCHECK, COPY --from untrusted image. Verified `keur scan` 2026-09-26.
# mestjs web (Next.js) — deliberately-vulnerable frontend, containerised as a
# ZAP scan target. DO NOT deploy this publicly.
#
# The web app targets Cloudflare (opennext/wrangler) for real deploys, but as a
# scan target we run the plain Next.js server (`next build` + `next start`).

ARG NODE_VERSION=20.19.1

# ---- build stage -----------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
# API base URL is baked at build time; overridable via compose.
ENV NEXT_PUBLIC_API_URL=http://localhost:3000/api
RUN npm run build

# ---- runtime stage ---------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app ./

EXPOSE 3001
# next start honours $PORT.
CMD ["npm", "run", "start"]