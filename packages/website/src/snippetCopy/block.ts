import { Effect, HashSet } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CopySnippet, WaitBeforeHidingCopiedIndicator } from './command'
import { Message } from './message'
import { Model } from './model'
import { type ViewInputs, view } from './view'

const COPY_INDICATOR_DURATION = '2 seconds'

export class SnippetCopy extends Block<SnippetCopy, void, ViewInputs>()(
  'SnippetCopy',
  {
    Model,
    Message,
    Command: [CopySnippet, WaitBeforeHidingCopiedIndicator],
  },
) {}

export const SnippetCopyLive = SnippetCopy.make(
  Effect.fn(function* () {
    return {
      model: { copiedSnippetIds: HashSet.empty() },

      update: {
        ClickedCopySnippet: (model, { snippetId, text }) => ({
          model,
          commands: [CopySnippet({ snippetId, text })],
        }),

        SucceededCopySnippet: (model, { snippetId }) =>
          HashSet.has(model.copiedSnippetIds, snippetId)
            ? { model }
            : {
                model: modifyFields(model, {
                  copiedSnippetIds: HashSet.add(snippetId),
                }),
                commands: [WaitBeforeHidingCopiedIndicator({ snippetId })],
              },

        FailedCopySnippet: model => ({ model }),

        CompletedWaitBeforeHidingCopiedIndicator: (model, { snippetId }) => ({
          model: modifyFields(model, {
            copiedSnippetIds: HashSet.remove(snippetId),
          }),
        }),
      },

      commands: {
        CopySnippet: ({ snippetId, text }) =>
          Effect.tryPromise({
            try: () => navigator.clipboard.writeText(text),
            catch: () => new Error('Failed to copy to clipboard'),
          }).pipe(
            Effect.as(Message.SucceededCopySnippet({ snippetId })),
            Effect.catch(() => Effect.succeed(Message.FailedCopySnippet())),
          ),
        WaitBeforeHidingCopiedIndicator: ({ snippetId }) =>
          Effect.sleep(COPY_INDICATOR_DURATION).pipe(
            Effect.as(
              Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
            ),
          ),
      },

      view,
    }
  }),
)
