import type { Html } from 'foldkit/html'

import { div } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import { link, pageTitle, para } from '../prose'

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('discord', 'Discord'),
      para(
        'Join the Foldkit Discord to ask questions, share what you\u2019re building, and connect with other developers.',
      ),
      para(link(Link.discord, 'Join the Discord server')),
    ],
  )
