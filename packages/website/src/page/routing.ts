import { docPage } from '../markdown'
import raw from './routing.md'

export const { view, tableOfContents } = docPage(raw, 'routing-and-navigation')
