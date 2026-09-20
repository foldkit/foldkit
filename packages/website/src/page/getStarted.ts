import { docPage } from '../markdown'
import raw from './getStarted.md'

export const { view, tableOfContents } = docPage(raw, 'get-started')
