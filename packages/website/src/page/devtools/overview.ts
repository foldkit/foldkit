import { docPage } from '../../markdown'
import raw from './overview.md'

export const { view, tableOfContents } = docPage(raw, 'devtools')
