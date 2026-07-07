import { Match as M } from 'effect'

import type { Message } from './message'

// M.tagsExhaustive dispatch, the sanctioned alternative to a switch on _tag.
export const label = (message: Message): string =>
  M.value(message).pipe(
    M.tagsExhaustive({
      Incremented: () => 'up',
      Decremented: () => 'down',
    }),
  )

type View = Readonly<{ kind: 'List' | 'Grid' }>

// A switch on a non-_tag discriminant is fine.
export const describe = (view: View): string => {
  switch (view.kind) {
    case 'List':
      return 'list'
    case 'Grid':
      return 'grid'
  }
}
