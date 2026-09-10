import { proseDocPage } from '../markdown'
import raw from './contact.md'

export const { view, tableOfContents } = proseDocPage(raw, 'contact')
