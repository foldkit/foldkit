import { Effect, Schema } from 'effect'
import * as Dom from 'foldkit/dom'

import { idSelector } from '../internal/selectors.js'
import { TabsBlock } from './definition.js'
import { tabId } from './ids.js'
import { Message } from './types.js'

/** @internal Canonical Tabs implementation. */
export const FocusTab = TabsBlock.makeCommand('FocusTab', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedFocusTab],
  handler: function* () {
    return ({ id, index }) =>
      Dom.focus(idSelector(tabId(id, index))).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusTab()),
      )
  },
})
