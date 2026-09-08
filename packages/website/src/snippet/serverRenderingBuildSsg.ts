foldkit({
  buildId,
  ssr: {
    serverEntry: '/src/entry.server.ts',
    build: { prerender: true },
  },
})
