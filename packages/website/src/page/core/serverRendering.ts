import { docPage } from '../../markdown'
import raw from './serverRendering.md'

export const { view, tableOfContents } = docPage(raw, 'core/server-rendering')
