import { proseDocPage } from '../markdown'
import raw from './about.md'

export const { view, tableOfContents } = proseDocPage(raw, 'about')
