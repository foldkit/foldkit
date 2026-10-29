import { appendFileSync } from 'node:fs'

export {
  renderDocument,
  renderPage,
  prerenderPaths,
} from '../build/entry.server.ts'

appendFileSync(new URL('./executions.txt', import.meta.url), 'executed\n')
