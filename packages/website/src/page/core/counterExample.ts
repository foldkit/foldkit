import { docPage } from '../../markdown'
import raw from './counterExample.md'

export const { view, tableOfContents } = docPage(raw, 'core/counter-example')
