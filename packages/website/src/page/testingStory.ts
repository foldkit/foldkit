import { docPage } from '../markdown'
import raw from './testingStory.md'

export const { view, tableOfContents } = docPage(raw, 'testing-story')
