import { docPage } from '../markdown'
import raw from './toolingLinting.md'

export const { view, tableOfContents } = docPage(raw, 'tooling/oxlint-plugin')
