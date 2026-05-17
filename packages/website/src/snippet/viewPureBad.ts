import { type Document, html } from 'foldkit/html'

import { Model } from './model'

// ❌ Don't do this in view
const view = (model: Model): Document => {
  const h = html()

  // Fetching data in view
  fetch('/api/user').then(res => res.json())

  // Setting timers
  setTimeout(() => console.log('tick'), 1000)

  // Subscriptions
  window.addEventListener('resize', handleResize)

  return { title: 'Hello', body: h.div([], ['Hello']) }
}
