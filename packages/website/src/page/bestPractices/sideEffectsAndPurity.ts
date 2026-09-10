import { docPage } from '../../markdown'
import raw from './sideEffectsAndPurity.md'

export const { view, tableOfContents } = docPage(
  raw,
  'best-practices/side-effects-and-purity',
)
