import { proseDocPage } from '../../markdown'
import raw from './freezeModel.md'

export const { view, tableOfContents } = proseDocPage(raw, 'core/freeze-model')
