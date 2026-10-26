import { Effect, HashSet, Layer, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SnippetCopyComposition } from './composition'
import {
  SnippetCopyDefinition,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
} from './definition'
import { Message } from './message'

export const update = SnippetCopyComposition.makeUpdate({
  ClickedCopySnippet: makeCommandsStep.fromMessage(({ snippetId, text }) => [
    CopySnippet({ snippetId, text }),
  ]),

  SucceededCopySnippet: (model, { snippetId }) =>
    HashSet.has(model.copiedSnippetIds, snippetId)
      ? { model }
      : {
          model: modifyFields(model, {
            copiedSnippetIds: HashSet.add(snippetId),
          }),
          commands: [WaitBeforeHidingCopiedIndicator({ snippetId })],
        },

  FailedCopySnippet: makeNoopStep(),

  CompletedWaitBeforeHidingCopiedIndicator: makeFieldsStep.fromMessage(
    ({ snippetId }) => ({
      copiedSnippetIds: HashSet.remove(snippetId),
    }),
  ),
})

export const CopySnippet = SnippetCopyDefinition.makeCommand('CopySnippet', {
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

export const WaitBeforeHidingCopiedIndicator =
  SnippetCopyDefinition.makeCommand('WaitBeforeHidingCopiedIndicator', {
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
  })

export const EffectsLayer = Layer.mergeAll(
  CopySnippet.layer,
  WaitBeforeHidingCopiedIndicator.layer,
)
