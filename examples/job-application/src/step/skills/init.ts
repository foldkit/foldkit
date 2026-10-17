import { type Model } from './definition'
import * as Entry from './entry'

export const init = (initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
})
