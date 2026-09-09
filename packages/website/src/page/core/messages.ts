import { docPage } from '../../markdown'
import raw from './messages.md'

export const { view, tableOfContents } = docPage(raw, 'core/messages')
