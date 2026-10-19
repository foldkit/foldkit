import { Match } from 'effect'

import type { Message } from './message'

// Effect Match provides exhaustive dispatch when a union has no match helper.
export const label = (message: Message): string =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
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
