import type { Document, HtmlBuilder } from 'foldkit/html'

import type { Message } from './message'
import type { Model } from './model'

// ❌ Don't do this in view
const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  fetch('/api/user').then(res => res.json())
  setTimeout(() => console.log('tick'), 1000)
  window.addEventListener('resize', () => {})

  return { title: model.title, body: h.div([], [model.title]) }
}
