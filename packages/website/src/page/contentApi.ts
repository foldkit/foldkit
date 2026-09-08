import { docPage } from '../markdown'
import raw from './contentApi.md'

export const { view, tableOfContents } = docPage(raw, 'api')
