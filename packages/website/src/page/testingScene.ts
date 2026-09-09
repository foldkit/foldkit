import { docPage } from '../markdown'
import raw from './testingScene.md'

export const { view, tableOfContents } = docPage(raw, 'testing-scene')
