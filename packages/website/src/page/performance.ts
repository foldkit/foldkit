import { proseDocPage } from '../markdown'
import raw from './performance.md'

export const { view, tableOfContents } = proseDocPage(raw, 'performance')
