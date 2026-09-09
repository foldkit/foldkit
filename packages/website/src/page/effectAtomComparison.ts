import { docPage } from '../markdown'
import raw from './effectAtomComparison.md'

export const { view, tableOfContents } = docPage(
  raw,
  'foldkit-vs-react-effect-atom',
)
