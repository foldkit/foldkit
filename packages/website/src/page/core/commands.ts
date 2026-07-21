import { docPage } from '../../markdown'
import raw from './commands.md'

export const { view, tableOfContents } = docPage(raw, 'core/commands')
