import { docPage } from '../../markdown'
import raw from './browser.md'

export const { view, tableOfContents } = docPage(raw, 'core/browser')
