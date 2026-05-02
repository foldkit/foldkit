import { Option } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, empty, h3 } from '../../../view/html'

export const getReady = (maybeGameText: Option.Option<string>): Html =>
  div(
    [Class('space-y-6')],
    [
      h3([Class('uppercase')], ['Preparing game...']),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: text => div([], [text]),
      }),
    ],
  )
