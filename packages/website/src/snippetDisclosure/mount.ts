import { Effect, Schema } from 'effect'
import { Mount } from 'foldkit'

import { Message } from './message'
import { SnippetSize } from './model'

export const COLLAPSED_PREVIEW_HEIGHT_PX = 300
export const MINIMUM_EXPANSION_HEIGHT_PX = 48

const COLLAPSIBLE_HEIGHT_PX =
  COLLAPSED_PREVIEW_HEIGHT_PX + MINIMUM_EXPANSION_HEIGHT_PX

export const MeasureSnippetHeight = Mount.define('MeasureSnippetHeight', {
  args: { snippetId: Schema.String },
  messages: [Message.CompletedMeasureSnippetHeight],
  execute: ({ element, snippetId }) =>
    Effect.sync(() =>
      Message.CompletedMeasureSnippetHeight({
        snippetId,
        snippetSize:
          element.scrollHeight > COLLAPSIBLE_HEIGHT_PX
            ? SnippetSize.Overflows()
            : SnippetSize.Fits(),
      }),
    ),
})
