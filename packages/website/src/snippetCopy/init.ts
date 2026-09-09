import { HashSet } from 'effect'
import { type Update } from 'foldkit'

import { type Message } from './message'
import { type Model } from './model'

export const init = (): Update.Return<Model, Message> => ({
  model: {
    copiedSnippetIds: HashSet.empty(),
  },
})
