import { relative, resolve } from 'node:path'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
    {
      name: 'routing-bundle-evidence',
      generateBundle(_options, bundle) {
        this.emitFile({
          type: 'asset',
          fileName: 'bundle-modules.json',
          source: JSON.stringify(
            Object.values(bundle).flatMap(output =>
              output.type === 'chunk'
                ? [
                    {
                      file: output.fileName,
                      modules: Object.keys(output.modules)
                        .map(id =>
                          relative(resolve(__dirname, '../..'), id).replaceAll(
                            '\\',
                            '/',
                          ),
                        )
                        .sort(),
                    },
                  ]
                : [],
            ),
          ),
        })
      },
    },
  ],
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  build: {
    manifest: true,
    rolldownOptions: {
      input: { routing: 'index.html', lazy: 'lazy.html' },
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
