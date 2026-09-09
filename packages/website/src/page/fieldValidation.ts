import { docPage } from '../markdown'
import raw from './fieldValidation.md'

export const { view, tableOfContents } = docPage(raw, 'field-validation')
