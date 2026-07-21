import { proseDocPage } from '../markdown'
import raw from './manifesto.md'

export const { view, tableOfContents } = proseDocPage(raw, 'manifesto')
