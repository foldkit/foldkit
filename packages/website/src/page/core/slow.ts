import { docPage } from '../../markdown'
import raw from './slow.md'

export const { view, tableOfContents } = docPage(raw, 'core/slow-warnings')
