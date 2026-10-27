import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

const sourceFile = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./fixture', import.meta.url)),
  plugins: [foldkit({ devToolsMcpPort: false })],
  resolve: {
    alias: {
      'foldkit/block': sourceFile('../../../foldkit/src/block/public.ts'),
      'foldkit/html': sourceFile('../../../foldkit/src/html/public.ts'),
      'foldkit/message': sourceFile('../../../foldkit/src/message/public.ts'),
      'foldkit/render': sourceFile('../../../foldkit/src/render/public.ts'),
      'foldkit/schema': sourceFile('../../../foldkit/src/schema/public.ts'),
      'foldkit/struct': sourceFile('../../../foldkit/src/struct/public.ts'),
      '@foldkit/ui/virtualList': sourceFile('../../src/virtualList/public.ts'),
      foldkit: sourceFile('../../../foldkit/src/index.ts'),
    },
    dedupe: ['effect', 'foldkit'],
  },
  server: {
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../../../../', import.meta.url))] },
  },
})
