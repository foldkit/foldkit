import { html } from 'foldkit/html'

import type { Message } from './message'
import { tasksRouter } from './route'

const h = html<Message>()

export const tasksLink = h.a([h.Href(tasksRouter())], ['Tasks'])
