import { docPage } from '../../markdown'
import raw from './customElement.md'

export const { view, tableOfContents } = docPage(raw, 'core/custom-element')
