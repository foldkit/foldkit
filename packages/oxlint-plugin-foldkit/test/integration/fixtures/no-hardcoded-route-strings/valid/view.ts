import { inertHtml as ih } from 'foldkit/html'

import { tasksRouter } from './route'

export const tasksLink = ih.a([ih.Href(tasksRouter())], ['Tasks'])
