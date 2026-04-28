import { Document, html } from 'foldkit/html'

import { Model } from './model'

const { div } = html()

// ❌ Don't do this in view
const view = (model: Model): Document => {
  // Fetching data in view
  fetch('/api/user').then(res => res.json())

  // Setting timers
  setTimeout(() => console.log('tick'), 1000)

  // Subscriptions
  window.addEventListener('resize', handleResize)

  return { title: 'Hello', body: div([], ['Hello']) }
}
