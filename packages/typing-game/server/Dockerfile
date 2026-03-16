# syntax = docker/dockerfile:1

FROM node:22-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app
COPY . .

ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @typing-game/server... build

WORKDIR /app/packages/typing-game/server

EXPOSE 3001
CMD ["node", "dist/index.js"]
