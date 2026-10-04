import { HashMap, HashSet } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
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
  })
