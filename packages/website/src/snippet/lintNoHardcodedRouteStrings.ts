import { html } from 'foldkit/html'

import { tasksRouter } from '../route'

const h = html<Message>()

// ❌ Bad
// A hardcoded path rots when the route changes and bypasses the Route module.
const badLink = h.a([h.Href('/tasks')], [text('Tasks')])

// ✅ Good
// Build the href from the Router so it stays in sync with the route.
const goodLink = h.a([h.Href(tasksRouter())], [text('Tasks')])
