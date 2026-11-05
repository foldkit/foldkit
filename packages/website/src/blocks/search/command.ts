import { Effect } from 'effect'
import * as Dom from 'foldkit/dom'

import { SEARCH_INPUT_ID } from '../../searchDom'
import { makeCommand } from './block'
import { Message } from './message'

export const FocusSearchInput = makeCommand('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusSearchInput()),
      )
  },
})
