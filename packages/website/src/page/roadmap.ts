import { proseDocPage } from '../markdown'
import raw from './roadmap.md'

export const { view, tableOfContents } = proseDocPage(raw, 'roadmap')
