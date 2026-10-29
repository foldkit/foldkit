import { Array, Option } from 'effect'
import type { Plugin } from 'vite'

export const recordModuleIds = (moduleIds: Array<string>): Plugin => ({
  name: 'test:record-module-ids',
  buildEnd() {
    moduleIds.push(...this.getModuleIds())
  },
})

export const isFoldkitBuildTokenModuleId = (id: string): boolean =>
  Option.getOrThrow(Array.head(id.split('?', 1)))
    .replaceAll('\\', '/')
    .endsWith('/foldkit/dist/buildToken.js')
