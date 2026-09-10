import { docPage } from '../markdown'
import raw from './asyncData.md'

export const { view, tableOfContents } = docPage(raw, 'async-data')
