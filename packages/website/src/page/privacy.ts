import { proseDocPage } from '../markdown'
import raw from './privacy.md'

export const { view, tableOfContents } = proseDocPage(raw, 'privacy')
