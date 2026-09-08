import { docPage } from '../../markdown'
import raw from './init.md'

export const { view, tableOfContents } = docPage(raw, 'core/init')
