import { HashMap, HashSet } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ToggledSnippet: ({ snippetId, isOpen }) => ({
      model: modifyFields(model, {
        openSnippetIds: isOpen
          ? HashSet.add(snippetId)
          : HashSet.remove(snippetId),
      }),
    }),
    CompletedMeasureSnippetHeight: ({ snippetId, snippetSize }) => ({
      model: modifyFields(model, {
        snippetSizes: HashMap.set(snippetId, snippetSize),
      }),
    }),
  }),
)
