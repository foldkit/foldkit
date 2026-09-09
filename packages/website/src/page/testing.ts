import { docPage } from '../markdown'
import raw from './testing.md'

export const { view, tableOfContents } = docPage(raw, 'testing')
