import { Effect, HashSet, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedCopySnippet: ({ snippetId, text }) => ({
      model,
      commands: [CopySnippet({ snippetId, text })],
    }),

    SucceededCopySnippet: ({ snippetId }) =>
      HashSet.has(model.copiedSnippetIds, snippetId)
        ? { model }
        : {
            model: evo(model, {
              copiedSnippetIds: HashSet.add(snippetId),
            }),
            commands: [WaitBeforeHidingCopiedIndicator({ snippetId })],
          },

    FailedCopySnippet: () => ({ model }),

    CompletedWaitBeforeHidingCopiedIndicator: ({ snippetId }) => ({
      model: evo(model, {
        copiedSnippetIds: HashSet.remove(snippetId),
      }),
    }),
  })

// COMMAND

export const CopySnippet = Command.define('CopySnippet', {
  args: { snippetId: Schema.String, text: Schema.String },
  messages: [Message.SucceededCopySnippet, Message.FailedCopySnippet],
  execute: ({ snippetId, text }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopySnippet({ snippetId })),
      Effect.catch(() => Effect.succeed(Message.FailedCopySnippet())),
    ),
})

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingCopiedIndicator = Command.define(
  'WaitBeforeHidingCopiedIndicator',
  {
    args: { snippetId: Schema.String },
    messages: [Message.CompletedWaitBeforeHidingCopiedIndicator],
    execute: ({ snippetId }) =>
      Effect.sleep(COPY_INDICATOR_DURATION).pipe(
        Effect.as(
          Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
        ),
      ),
  },
)
