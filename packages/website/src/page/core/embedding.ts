import { docPage } from '../../markdown'
import raw from './embedding.md'

export const { view, tableOfContents } = docPage(raw, 'core/embedding')
