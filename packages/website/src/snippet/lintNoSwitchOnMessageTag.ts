import { Match as M } from 'effect'

// ❌ Bad
// A switch on _tag has no exhaustiveness check, so a new variant silently
// falls through.
const badLabel = (message: Message): string => {
  switch (message._tag) {
    case 'Incremented':
      return 'up'
    case 'Decremented':
      return 'down'
  }
}

// ✅ Good
// M.tagsExhaustive makes a forgotten variant a type error.
const goodLabel = (message: Message): string =>
  M.value(message).pipe(
    M.tagsExhaustive({
      Incremented: () => 'up',
      Decremented: () => 'down',
    }),
  )
