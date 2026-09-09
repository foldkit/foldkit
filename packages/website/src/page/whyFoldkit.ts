import { proseDocPage } from '../markdown'
import raw from './whyFoldkit.md'

export const { view, tableOfContents } = proseDocPage(raw, 'why-foldkit')
