foldkit({
  buildId,
  ssr: {
    serverEntry: '/src/entry.server.ts',
    clientEntry: '/src/entry.ts',
    build: { prerender: true },
  },
})
