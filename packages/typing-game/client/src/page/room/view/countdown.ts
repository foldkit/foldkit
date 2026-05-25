import { Option } from 'effect'
import { Html, html } from 'foldkit/html'

import type { Message } from '../message'

export const countdown = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], [`Starting in ${secondsLeft}...`]),
      Option.match(maybeGameText, {
        onNone: () => h.empty,
        onSome: text => h.div([], [text]),
      }),
    ],
  )
}
