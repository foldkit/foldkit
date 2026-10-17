import { Effect, HashSet, Layer, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SnippetCopyComposition } from './definition'
import { SnippetCopy } from './definition'
import { Message } from './message'

export const update = SnippetCopyComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedCopySnippet: ({ snippetId, text }) => ({
      model,
      commands: [CopySnippet({ snippetId, text })],
    }),

    SucceededCopySnippet: ({ snippetId }) =>
      HashSet.has(model.copiedSnippetIds, snippetId)
        ? { model }
        : {
            model: modifyFields(model, {
              copiedSnippetIds: HashSet.add(snippetId),
            }),
            commands: [WaitBeforeHidingCopiedIndicator({ snippetId })],
          },

    FailedCopySnippet: () => ({ model }),

    CompletedWaitBeforeHidingCopiedIndicator: ({ snippetId }) => ({
      model: modifyFields(model, {
        copiedSnippetIds: HashSet.remove(snippetId),
      }),
    }),
  }),
)

export const CopySnippet = SnippetCopy.command('CopySnippet', {
  args: { snippetId: Schema.String, text: Schema.String },
  messages: [Message.SucceededCopySnippet, Message.FailedCopySnippet],
  handler: function* () {
    return ({ snippetId, text }) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(text),
        catch: () => new Error('Failed to copy to clipboard'),
      }).pipe(
        Effect.as(Message.SucceededCopySnippet({ snippetId })),
        Effect.catch(() => Effect.succeed(Message.FailedCopySnippet())),
      )
  },
})

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingCopiedIndicator = SnippetCopy.command(
  'WaitBeforeHidingCopiedIndicator',
  {
    args: { snippetId: Schema.String },
    messages: [Message.CompletedWaitBeforeHidingCopiedIndicator],
    handler: function* () {
      return ({ snippetId }) =>
        Effect.sleep(COPY_INDICATOR_DURATION).pipe(
          Effect.as(
            Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
          ),
        )
    },
  },
)

export const EffectsLayer = Layer.mergeAll(
  CopySnippet.layer,
  WaitBeforeHidingCopiedIndicator.layer,
)
