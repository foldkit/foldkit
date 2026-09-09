import { docPage } from '../markdown'
import raw from './aiMcp.md'

export const { view, tableOfContents } = docPage(raw, 'ai/mcp')
