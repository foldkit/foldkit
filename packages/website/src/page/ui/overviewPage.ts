import { docPage } from '../../markdown'
import raw from './overviewPage.md'

export const { view, tableOfContents } = docPage(raw, 'ui/overview')
