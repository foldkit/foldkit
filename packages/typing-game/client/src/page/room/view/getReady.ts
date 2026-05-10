import { Option } from 'effect'
import { Html, html } from 'foldkit/html'

export const getReady = <ParentMessage>(
  maybeGameText: Option.Option<string>,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], ['Preparing game...']),
      Option.match(maybeGameText, {
        onNone: () => h.empty,
        onSome: text => h.div([], [text]),
      }),
    ],
  )
}
