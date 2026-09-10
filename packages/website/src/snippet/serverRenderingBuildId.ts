// vite.config.ts: the plugin compiles the value into application code, from
// its `buildId` option or from FOLDKIT_BUILD_ID.
foldkit({ buildId: process.env.DEPLOYMENT_SHA })

// src/entry.server.ts
Server.renderToString(config, {
  flags,
  buildId: import.meta.env.FOLDKIT_BUILD_ID,
})

// src/entry.ts
Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
