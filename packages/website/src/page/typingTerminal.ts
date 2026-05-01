import type { Html } from 'foldkit/html'

import { Class, Href, a, div, p } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  bullets,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  coreCommandsRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
} from '../route'

const fullStackEffectHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'a-full-stack-effect-app',
  text: 'A full-stack Effect app',
}

const whatsInItHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'whats-in-it',
  text: 'What’s in it',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  fullStackEffectHeader,
  whatsInItHeader,
]

const ctaLinkClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-medium'

const ctaRow: Html = p(
  [Class('mb-8 flex flex-wrap gap-x-6 gap-y-2')],
  [
    a(
      [Href(Link.typingTerminal), Class(ctaLinkClassName)],
      ['Race your friends →'],
    ),
    a(
      [Href(Link.typingTerminalSource), Class(ctaLinkClassName)],
      ['View source on GitHub →'],
    ),
  ],
)

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('typing-terminal', 'Typing Terminal'),
      para(
        'A production real-time multiplayer typing speed game. Build a room, share the code, and race friends to type the same passage. It runs at ',
        link(Link.typingTerminal, 'typingterminal.com'),
        '.',
      ),
      para(
        'The other entries in this section are single-process apps that show one feature at a time. Typing Terminal is the full picture: a Foldkit client, an Effect-based RPC server, and a shared schema package that both ends import directly.',
      ),
      ctaRow,
      tableOfContentsEntryToHeader(fullStackEffectHeader),
      para('The repo splits into three packages.'),
      bullets(
        p(
          [],
          [
            inlineCode('shared/'),
            ' declares Effect Schemas (',
            inlineCode('Room'),
            ', ',
            inlineCode('Player'),
            ', ',
            inlineCode('GameStatus'),
            ', ',
            inlineCode('PlayerProgress'),
            ') and the ',
            inlineCode('RoomRpcs'),
            ' group built with ',
            inlineCode('@effect/rpc'),
            '. Both client and server import from here. There is no codegen step. Adding a field to a payload schema produces type errors on both sides at the same time.',
          ],
        ),
        p(
          [],
          [
            inlineCode('server/'),
            ' is a Node HTTP server built on ',
            inlineCode('@effect/platform'),
            ' and ',
            inlineCode('@effect/rpc'),
            '. Room state lives in ',
            inlineCode('Ref<HashMap>'),
            ' stores provided as Effect Services. The streaming subscription RPC pushes room updates and per-player progress to every connected client over NDJSON.',
          ],
        ),
        p(
          [],
          [
            inlineCode('client/'),
            ' is a Foldkit app with two routes (Home and Room) and the same Model / Message / update / view loop you have seen in the smaller examples, scaled up. The ',
            link(Link.typingTerminalRoomSource, 'Room submodel'),
            ' coordinates the live game: it consumes the streaming RPC as a Subscription, dispatches keystroke updates as Commands, and renders the scoreboard from a derived view of the synced room state.',
          ],
        ),
      ),
      para(
        'No new framework concepts are involved. The architecture is the same one ',
        link(exampleDetailRouter({ exampleSlug: 'counter' }), 'Counter'),
        ' uses. The interesting part is what falls out when that architecture meets a real backend: shared schemas across the wire, a typed RPC client without runtime decoders, a streaming ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' that owns reconnect logic, and ',
        link(coreCommandsRouter(), 'Commands'),
        ' that map cleanly to RPC calls.',
      ),
      tableOfContentsEntryToHeader(whatsInItHeader),
      bullets(
        'Multiplayer rooms with hosts and joiners, joined by a short room code',
        p(
          [],
          [
            'A ',
            inlineCode('Waiting | GetReady | Countdown | Playing | Finished'),
            ' state machine modelled as a discriminated union on the server, mirrored on the client',
          ],
        ),
        'Live progress streaming: every keystroke from every player flows through the same RPC stream and updates the scoreboard in real time',
        'Per-player WPM and accuracy scoring computed on the server',
        'Reconnect-tolerant subscriptions with pending-cleanup tracking so a brief disconnect does not drop you from the room',
      ),
    ],
  )
