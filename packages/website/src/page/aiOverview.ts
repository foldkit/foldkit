import { docPage } from '../markdown'
import raw from './aiOverview.md'

export const { view, tableOfContents } = docPage(raw, 'ai/overview')
