FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV VP_HOME=/opt/vite-plus PATH=/opt/vite-plus/bin:$PATH
RUN curl -fsSL https://vite.plus | VP_NODE_MANAGER=no VP_PM_MANAGER=yes bash
COPY package.json pnpm-lock.yaml ./
RUN vp install --frozen-lockfile
COPY . .
RUN vpr build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
ENV VP_HOME=/opt/vite-plus PATH=/opt/vite-plus/bin:$PATH
COPY --from=build --chown=node:node /opt/vite-plus /opt/vite-plus
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
RUN mkdir -p /app/data /app/node_modules/.cache && chown node:node /app /app/data /app/node_modules /app/node_modules/.cache && chown -R node:node /app/node_modules/.vite
USER node
EXPOSE 3000
CMD ["vp", "run", "start"]
