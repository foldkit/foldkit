import { docPage } from '../../markdown'
import raw from './resources.md'

export const { view, tableOfContents } = docPage(raw, 'core/resources')
