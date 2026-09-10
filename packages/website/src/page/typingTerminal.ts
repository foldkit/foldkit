import { proseDocPage } from '../markdown'
import raw from './typingTerminal.md'

export const { view, tableOfContents } = proseDocPage(raw, 'typing-terminal')
