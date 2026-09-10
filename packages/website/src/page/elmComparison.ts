import { docPage } from '../markdown'
import raw from './elmComparison.md'

export const { view, tableOfContents } = docPage(
  raw,
  'foldkit-vs-elm-side-by-side',
)
