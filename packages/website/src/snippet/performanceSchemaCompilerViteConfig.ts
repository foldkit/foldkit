import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [
    foldkit({
      schemaCompiler: {
        modules: ['/src/schema/api.ts', '/src/schema/model.ts'],
        operations: ['decode', 'encode'],
      },
    }),
  ],
})
