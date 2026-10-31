import { Schema } from 'effect'
import { Mount } from 'foldkit'

import { Message } from './message'

export const COLLAPSED_PREVIEW_HEIGHT_PX = 300
export const MINIMUM_EXPANSION_HEIGHT_PX = 48

export const COLLAPSIBLE_HEIGHT_PX =
  COLLAPSED_PREVIEW_HEIGHT_PX + MINIMUM_EXPANSION_HEIGHT_PX

export const MeasureSnippetHeight = Mount.define('MeasureSnippetHeight', {
  args: { snippetId: Schema.String },
  messages: [Message.CompletedMeasureSnippetHeight],
})
