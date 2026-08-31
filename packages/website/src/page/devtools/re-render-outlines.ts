import { docPage } from '../../markdown'
import raw from './re-render-outlines.md'

export const { view, tableOfContents } = docPage(
  raw,
  'devtools/re-render-outlines',
)
