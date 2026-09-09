import { proseDocPage } from '../../markdown'
import raw from './messages.md'

export const { view, tableOfContents } = proseDocPage(
  raw,
  'best-practices/messages',
)
