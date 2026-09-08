import type { HtmlBuilder } from 'foldkit/html'

import { tasksRouter } from './route'

// ❌ Bad
// A hardcoded path rots when the route changes and bypasses the Route module.
const badLink = (h: HtmlBuilder<Message>) => h.a([h.Href('/tasks')], ['Tasks'])

// ✅ Good
// Build the href from the Router so it stays in sync with the route.
const goodLink = (h: HtmlBuilder<Message>) =>
  h.a([h.Href(tasksRouter())], ['Tasks'])
