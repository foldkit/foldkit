# syntax = docker/dockerfile:1

FROM node:22-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app
COPY . .

ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @foldkit/now-server... build

WORKDIR /app/packages/now-server

EXPOSE 3002
CMD ["node", "dist/index.js"]
