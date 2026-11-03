import { Option } from 'effect'
import { Html } from 'foldkit/html'

import type { RoomViewBuilder } from '../composition'

export const getReady = (
  maybeGameText: Option.Option<string>,
  h: RoomViewBuilder,
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
