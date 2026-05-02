import { Option } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, empty, h3 } from '../../../view/html'

export const countdown = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
): Html =>
  div(
    [Class('space-y-6')],
    [
      h3([Class('uppercase')], [`Starting in ${secondsLeft}...`]),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: text => div([], [text]),
      }),
    ],
  )
