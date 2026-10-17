import { docPage } from '../../markdown'
import raw from './selectionBlocksPage.md'

export const { view, tableOfContents } = docPage(raw, 'ui/selection-blocks')
