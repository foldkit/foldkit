import { docPage } from '../../markdown'
import raw from './model.md'

export const { view, tableOfContents } = docPage(raw, 'core/model')
