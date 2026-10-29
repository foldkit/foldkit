import type { Plugin } from 'vite'

export const exampleClientDependencies = (): Plugin => ({
  name: 'foldkit:example-client-dependencies',
  apply: 'serve',
  configEnvironment: (name, config) => {
    const consumer =
      config.consumer ?? (name === 'client' ? 'client' : 'server')

    if (consumer === 'client') {
      return {
        optimizeDeps: {
          include: [
            '@effect/platform-browser',
            'effect/http',
            'effect/persistence',
            '@foldkit/devtools > clsx',
            'foldkit > parse5',
          ],
        },
      }
    } else {
      return undefined
    }
  },
})
