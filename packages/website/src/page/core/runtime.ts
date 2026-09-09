import { docPage } from '../../markdown'
import raw from './runtime.md'

export const { view, tableOfContents } = docPage(raw, 'core/runtime')
