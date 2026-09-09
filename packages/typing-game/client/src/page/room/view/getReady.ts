import { Option } from 'effect'
import { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '../message'

export const getReady = (
  maybeGameText: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], ['Preparing game...']),
      Option.match(maybeGameText, {
        onNone: () => h.empty,
        onSome: text => h.div([], [text]),
      }),
    ],
  )
