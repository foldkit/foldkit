import { createLazy } from 'foldkit/html'

// ❌ Bad
// Creating the lazy slot inside the view gives it a new identity every render,
// so the memoized view never hits its cache.
const badView = (model: Model) => {
  const lazyHeader = createLazy()
  return lazyHeader(renderHeader, [model.title])
}

// ✅ Good
// Declare the lazy slot once at module scope.
const lazyHeader = createLazy()
const goodView = (model: Model) => lazyHeader(renderHeader, [model.title])
