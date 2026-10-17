import { docPage } from '../../markdown'
import raw from './informingBlocks.md'

export const { view, tableOfContents } = docPage(
  raw,
  'patterns/informing-blocks',
)
