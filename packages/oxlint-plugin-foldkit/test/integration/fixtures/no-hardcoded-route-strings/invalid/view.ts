import { html } from 'foldkit/html'

import type { Message } from './message'

const h = html<Message>()

export const tasksLink = h.a([h.Href('/tasks')], ['Tasks'])
