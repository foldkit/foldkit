import { docPage } from '../../markdown'
import raw from './file.md'

export const { view, tableOfContents } = docPage(raw, 'core/file')
