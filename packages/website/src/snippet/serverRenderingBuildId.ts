// vite.config.ts: give separate build jobs the same deployment id.
foldkit({ buildId: process.env.DEPLOYMENT_ID })
