import { proseDocPage } from '../../markdown'
import raw from './architecture.md'

export const { view, tableOfContents } = proseDocPage(raw, 'core/architecture')
