import { docPage } from '../../markdown'
import raw from './http.md'

export const { view, tableOfContents } = docPage(raw, 'core/http')
