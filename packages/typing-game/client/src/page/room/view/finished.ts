import * as Shared from '@typing-game/shared'
import { clsx } from 'clsx'
import { Array, Number, Option, Order, pipe } from 'effect'
import { Html, html } from 'foldkit/html'

import type { Message } from '../message'
import { RoomPlayerSession } from '../model'

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.flip,
)

const scoreboardView = (
  scoreboard: Shared.Scoreboard,
  hostId: string,
): Html => {
  const h = html<Message>()
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)

  return h.table(
    [h.Class('border-2 border-terminal-green box-glow w-full border-collapse')],
    [
      h.thead(
        [],
        [
          h.tr(
            [],
            [
              h.th(
                [
                  h.Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-left',
                  ),
                ],
                ['Player'],
              ),
              h.th(
                [
                  h.Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['WPM'],
              ),
              h.th(
                [
                  h.Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['Accuracy'],
              ),
              h.th(
                [
                  h.Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['Chars'],
              ),
            ],
          ),
        ],
      ),
      h.tbody(
        [],
        Array.map(sortedScoreboard, (score, index) => {
          const isFirst = index === 0
          const isHost = score.playerId === hostId

          return h.tr(
            [],
            [
              h.td(
                [
                  h.Class(
                    clsx('p-4', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [
                  isFirst ? '> ' : '  ',
                  score.username,
                  ...(isHost
                    ? [h.span([h.Class('uppercase')], [' [host]'])]
                    : []),
                ],
              ),
              h.td(
                [
                  h.Class(
                    clsx('p-4 text-right', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [score.wpm.toFixed(1)],
              ),
              h.td(
                [
                  h.Class(
                    clsx('p-4 text-right', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [score.accuracy.toFixed(1) + '%'],
              ),
              h.td(
                [
                  h.Class(
                    clsx('p-4 text-right', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [String(score.charsTyped)],
              ),
            ],
          )
        }),
      ),
    ],
  )
}

export const finished = (
  maybeScoreboard: Option.Option<Shared.Scoreboard>,
  hostId: string,
  maybeSession: Option.Option<RoomPlayerSession>,
): Html => {
  const h = html<Message>()
  const isLocalPlayerHost = Option.exists(
    maybeSession,
    session => session.player.id === hostId,
  )

  return h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () => h.empty,
        onSome: scoreboard => scoreboardView(scoreboard, hostId),
      }),
      ...(isLocalPlayerHost
        ? [h.div([h.Class('mt-4')], ['> Enter to play again'])]
        : []),
    ],
  )
}
