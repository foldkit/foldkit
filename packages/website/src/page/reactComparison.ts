import { docPage } from '../markdown'
import raw from './reactComparison.md'

export const { view, tableOfContents } = docPage(
  raw,
  'foldkit-vs-react-side-by-side',
)
