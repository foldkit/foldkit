import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { inject } from 'vitest'

declare module 'vitest' {
  export interface ProvidedContext {
    serverCacheRoot: string
  }
}

export const createServerCache = () =>
  mkdtemp(join(inject('serverCacheRoot'), 'server-'))
