import { docPage } from '../../markdown'
import raw from './query.md'

export const { view, tableOfContents } = docPage(raw, 'core/query')
