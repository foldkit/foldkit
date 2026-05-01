// @ts-nocheck
import * as Shared from '@typing-game/shared'
import { clsx } from 'clsx'
import { Array, Number, Option, Order, pipe } from 'effect'
import { Html } from 'foldkit/html'

import {
  Class,
  div,
  empty,
  h3,
  span,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
} from '../../../view/html'
import { RoomPlayerSession } from '../model'

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.flip,
)

const scoreboardView = (scoreboard: Shared.Scoreboard, hostId: string) => {
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)

  return table(
    [Class('border-2 border-terminal-green box-glow w-full border-collapse')],
    [
      thead(
        [],
        [
          tr(
            [],
            [
              th(
                [
                  Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-left',
                  ),
                ],
                ['Player'],
              ),
              th(
                [
                  Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['WPM'],
              ),
              th(
                [
                  Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['Accuracy'],
              ),
              th(
                [
                  Class(
                    'p-4 border-b-2 border-terminal-green uppercase text-right',
                  ),
                ],
                ['Chars'],
              ),
            ],
          ),
        ],
      ),
      tbody(
        [],
        Array.map(sortedScoreboard, (score, index) => {
          const isFirst = index === 0
          const isHost = score.playerId === hostId

          return tr(
            [],
            [
              td(
                [
                  Class(
                    clsx('p-4', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [
                  isFirst ? '> ' : '  ',
                  score.username,
                  ...(isHost ? [span([Class('uppercase')], [' [host]'])] : []),
                ],
              ),
              td(
                [
                  Class(
                    clsx('p-4 text-right', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [score.wpm.toFixed(1)],
              ),
              td(
                [
                  Class(
                    clsx('p-4 text-right', {
                      'border-b-2 border-terminal-green':
                        index < Number.decrement(sortedScoreboard.length),
                    }),
                  ),
                ],
                [score.accuracy.toFixed(1) + '%'],
              ),
              td(
                [
                  Class(
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
  const isLocalPlayerHost = Option.exists(
    maybeSession,
    session => session.player.id === hostId,
  )

  return div(
    [Class('space-y-6')],
    [
      h3([Class('uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () => empty,
        onSome: scoreboard => scoreboardView(scoreboard, hostId),
      }),
      ...(isLocalPlayerHost
        ? [div([Class('mt-4')], ['> Enter to play again'])]
        : []),
    ],
  )
}
