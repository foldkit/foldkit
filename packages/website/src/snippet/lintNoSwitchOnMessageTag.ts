// ❌ Bad
// A switch on _tag has no exhaustiveness check, so a new variant silently
// falls through. It also exposes dispatch mechanics instead of organizing the
// logic around named variants.
const badLabel = (message: Message): string => {
  switch (message._tag) {
    case 'Incremented':
      return 'up'
    case 'Decremented':
      return 'down'
  }
}

// ✅ Good
// The idiomatic union matcher makes a forgotten variant a type error.
const goodLabel = (message: Message): string =>
  Message.match<string>(message, {
    Incremented: () => 'up',
    Decremented: () => 'down',
  })
