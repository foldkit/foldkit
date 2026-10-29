import { type HtmlBuilder, createLazy } from 'foldkit/html'

// ❌ Bad
// Creating the lazy slot inside the view gives it a new identity every render,
// so the memoized view never hits its cache.
const badView = (model: Model, h: HtmlBuilder<Message>) => {
  const lazyHeader = createLazy()
  return lazyHeader(renderHeader, [model.title, h])
}

// ✅ Good
// Declare the lazy slot once at module scope.
const lazyHeader = createLazy()
const goodView = (model: Model, h: HtmlBuilder<Message>) =>
  lazyHeader(renderHeader, [model.title, h])
