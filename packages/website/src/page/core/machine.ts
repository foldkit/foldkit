import { docPage } from '../../markdown'
import raw from './machine.md'

export const { view, tableOfContents } = docPage(raw, 'core/machine')
