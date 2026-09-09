import { docPage } from '../../markdown'
import raw from './render.md'

export const { view, tableOfContents } = docPage(raw, 'core/render')
