import type { Message } from './message'

// A switch on a dotted _tag has no exhaustiveness check.
export const label = (message: Message): string => {
  switch (message._tag) {
    case 'Incremented':
      return 'up'
    case 'Decremented':
      return 'down'
  }
}

// The bracket form message['_tag'] is the same _tag switch.
export const kind = (message: Message): string => {
  switch (message['_tag']) {
    case 'Incremented':
      return 'up'
    default:
      return 'other'
  }
}
