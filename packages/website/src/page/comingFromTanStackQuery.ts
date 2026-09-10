import { docPage } from '../markdown'
import raw from './comingFromTanStackQuery.md'

export const { view, tableOfContents } = docPage(
  raw,
  'coming-from-tanstack-query',
)
