import { docPage } from '../../markdown'
import raw from './anchorPage.md'

export const { view, tableOfContents } = docPage(raw, 'ui/anchor')
