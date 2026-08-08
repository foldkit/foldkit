import { docPage } from '../../markdown'
import raw from './antiPatterns.md'

export const { view, tableOfContents } = docPage(raw, 'patterns/anti-patterns')
