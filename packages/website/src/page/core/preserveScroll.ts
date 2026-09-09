import { proseDocPage } from '../../markdown'
import raw from './preserveScroll.md'

export const { view, tableOfContents } = proseDocPage(
  raw,
  'core/preserve-scroll',
)
