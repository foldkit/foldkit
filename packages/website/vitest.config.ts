import { type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

import { markdown } from '@foldkit/markdown/vite'

import {
  counterDemoCodePlugin,
  notePlayerDemoCodePlugin,
} from './scripts/demoCodePlugin'
import { islandAttributes } from './src/markdown/islandAttributes'
import { PostFrontmatter } from './src/page/blog/frontmatter'

const RESOLVED_TEST_MODULE_PREFIX = '\0website-test:'

const testModuleSource = (id: string): string | undefined => {
  if (id === 'virtual:landing-data') {
    return [
      "export const foldkitVersion = 'test'",
      "export const effectVersion = 'test'",
      'export const githubStarCount = null',
    ].join('\n')
  } else if (id === 'virtual:api-module-index') {
    return 'export default []'
  } else if (id === 'virtual:css-snippets') {
    return 'export default {}'
  } else if (id === 'virtual:playground-files') {
    return 'export default {}'
  } else if (id === 'virtual:playground-types') {
    return 'export default []'
  } else if (id === 'virtual:parsed-api') {
    return 'export default {}'
  } else if (id === 'virtual:api-highlights') {
    return 'export default {}'
  } else if (id.startsWith('virtual:example-sources/')) {
    return 'export default { files: [] }'
  } else {
    return undefined
  }
}

const virtualModulesTestPlugin = (): Plugin => ({
  name: 'virtual-modules-test',
  enforce: 'pre',
  resolveId(id: string) {
    if (testModuleSource(id) !== undefined) {
      return `${RESOLVED_TEST_MODULE_PREFIX}${id}`
    } else {
      return undefined
    }
  },
  load(id: string) {
    if (id.endsWith('?highlighted')) {
      return "export default ''"
    } else if (id.startsWith(RESOLVED_TEST_MODULE_PREFIX)) {
      return testModuleSource(id.slice(RESOLVED_TEST_MODULE_PREFIX.length))
    } else {
      return undefined
    }
  },
})

export default defineConfig({
  plugins: [
    virtualModulesTestPlugin(),
    markdown({ islands: islandAttributes, frontmatter: PostFrontmatter }),
    counterDemoCodePlugin(),
    notePlayerDemoCodePlugin(),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    server: {
      deps: {
        inline: ['foldkit', '@foldkit/ui', '@foldkit/devtools'],
      },
    },
  },
})
