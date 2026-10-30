import {
  Array,
  Duration,
  Effect,
  Match,
  Option,
  Random,
  Schedule,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block, Command, Dom } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const GRID_SIZE = 20
const POINTS_PER_APPLE = 10
const INITIAL_SNAKE_LENGTH = 3
const MIN_TICK_INTERVAL_MS = 80
const BASE_TICK_INTERVAL_MS = 150

const Position = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
})
type Position = typeof Position.Type

const Direction = Schema.Literals(['Up', 'Down', 'Left', 'Right'])
type Direction = typeof Direction.Type

const Snake = Schema.NonEmptyArray(Position)
type Snake = typeof Snake.Type

const INITIAL_POSITION: Position = { x: 10, y: 10 }
const INITIAL_DIRECTION: Direction = 'Right'

const positionEquivalence = Schema.toEquivalence(Position)

const wrapCoordinate = (coordinate: number): number => {
  if (coordinate < 0) {
    return GRID_SIZE - 1
  } else if (coordinate >= GRID_SIZE) {
    return 0
  } else {
    return coordinate
  }
}

const movePosition = (pos: Position, direction: Direction): Position => {
  const next = Match.value(direction).pipe(
    Match.when('Up', () => ({ x: pos.x, y: pos.y - 1 })),
    Match.when('Down', () => ({ x: pos.x, y: pos.y + 1 })),
    Match.when('Left', () => ({ x: pos.x - 1, y: pos.y })),
    Match.when('Right', () => ({ x: pos.x + 1, y: pos.y })),
    Match.exhaustive,
  )
  return { x: wrapCoordinate(next.x), y: wrapCoordinate(next.y) }
}

const oppositeDirection = (direction: Direction): Direction =>
  Match.value(direction).pipe(
    Match.withReturnType<Direction>(),
    Match.when('Up', () => 'Down'),
    Match.when('Down', () => 'Up'),
    Match.when('Left', () => 'Right'),
    Match.when('Right', () => 'Left'),
    Match.exhaustive,
  )

const isOppositeDirection = (a: Direction, b: Direction): boolean =>
  oppositeDirection(a) === b

export const createSnake = (startPos: Position): Snake =>
  Array.makeBy(INITIAL_SNAKE_LENGTH, i => ({
    x: startPos.x - i,
    y: startPos.y,
  }))

const moveSnake = (snake: Snake, direction: Direction): Snake =>
  Array.matchLeft(snake, {
    onEmpty: () => snake,
    onNonEmpty: (head, tail) => {
      const newHead = movePosition(head, direction)
      return [newHead, head, ...Array.dropRight(tail, 1)]
    },
  })

const growSnake = (snake: Snake, direction: Direction): Snake =>
  Array.matchLeft(snake, {
    onEmpty: () => snake,
    onNonEmpty: (head, tail) => {
      const newHead = movePosition(head, direction)
      return [newHead, head, ...tail]
    },
  })

const hasSelfCollision = (snake: Snake): boolean =>
  Array.matchLeft(snake, {
    onEmpty: () => false,
    onNonEmpty: (head, tail) =>
      Array.some(tail, segment => positionEquivalence(head, segment)),
  })

const snakeContains = (snake: Snake, pos: Position): boolean =>
  Array.some(snake, segment => positionEquivalence(segment, pos))

const randomApplePosition = (snake: Snake) =>
  Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE, {
      halfOpen: true,
    })
    const y = yield* Random.nextIntBetween(0, GRID_SIZE, {
      halfOpen: true,
    })
    const pos: Position = { x, y }

    if (snakeContains(snake, pos)) {
      return yield* Effect.fail('PositionCollision')
    } else {
      return pos
    }
  }).pipe(Effect.retry(Schedule.forever), Effect.orDie)

export const GameState = Schema.Literals([
  'NotStarted',
  'Playing',
  'Paused',
  'GameOver',
])
export type GameState = typeof GameState.Type

export const Model = Schema.Struct({
  snake: Snake,
  apple: Position,
  direction: Direction,
  nextDirection: Direction,
  gameState: GameState,
  points: Schema.Number,
  highScore: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  TickedClock: {},
  PressedKey: { key: Schema.String },
  PausedGame: {},
  RestartedGame: {},
  CompletedGenerateApplePosition: { position: Position },
})
export type Message = typeof Message.Type

type ApplicationViewBuilder = HtmlBuilder<Message>

export const GenerateApplePosition = Command.define('GenerateApplePosition', {
  args: { snake: Snake },
  messages: [Message.CompletedGenerateApplePosition],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [GenerateApplePosition],
}) {}

const cellClass = (x: number, y: number, model: Model): string => {
  const isSnakeHead = positionEquivalence(
    { x, y },
    Array.headNonEmpty(model.snake),
  )
  const isSnakeTail = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some(segment => positionEquivalence({ x, y }, segment)),
  )
  const isApple = positionEquivalence({ x, y }, model.apple)

  return Match.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
    Match.when({ isSnakeHead: true }, () => 'bg-green-700'),
    Match.when({ isSnakeTail: true }, () => 'bg-green-500'),
    Match.when({ isApple: true }, () => 'bg-red-500'),
    Match.orElse(() => 'bg-gray-800'),
  )
}

const gridView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('inline-block border-2 border-gray-600')],
    Array.makeBy(GRID_SIZE, y =>
      h.div(
        [h.Class('flex')],
        Array.makeBy(GRID_SIZE, x =>
          h.div([h.Class(`w-6 h-6 ${cellClass(x, y, model)}`)]),
        ),
      ),
    ),
  )

const gameStateView = (gameState: GameState): string =>
  Match.value(gameState).pipe(
    Match.when('NotStarted', () => 'Press SPACE to start'),
    Match.when('Playing', () => 'Playing - SPACE to pause'),
    Match.when('Paused', () => 'Paused - SPACE to continue'),
    Match.when('GameOver', () => 'Game Over - Press R to restart'),
    Match.exhaustive,
  )

const instructionsView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('mt-4 text-sm text-gray-400')],
    [
      h.p([], ['Use ARROW KEYS or WASD to move']),
      h.p([], ['SPACE to pause/start']),
      h.p([], ['R to restart']),
    ],
  )

const view = (model: Model, h: ApplicationViewBuilder): Document => ({
  title: `Snake | ${model.points} pts`,
  body: h.div(
    [
      h.Class(
        'flex flex-col items-center justify-center min-h-screen bg-black text-white p-8',
      ),
    ],
    [
      h.h1([h.Class('text-4xl font-bold mb-4')], ['Snake Game']),
      h.div(
        [h.Class('flex gap-8 mb-4')],
        [
          h.p([h.Class('text-xl')], [`Score: ${model.points}`]),
          h.p([h.Class('text-xl')], [`High Score: ${model.highScore}`]),
        ],
      ),
      h.p([h.Class('text-lg mb-4')], [gameStateView(model.gameState)]),
      gridView(model, h),
      instructionsView(h),
    ],
  ),
})

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const snake = createSnake(INITIAL_POSITION)

    return {
      model: {
        snake,
        apple: { x: 15, y: 15 },
        direction: INITIAL_DIRECTION,
        nextDirection: INITIAL_DIRECTION,
        gameState: 'NotStarted',
        points: 0,
        highScore: 0,
      },

      start: [GenerateApplePosition({ snake })],

      stream: Dom.streamFromEventFilterMapPreventDefault({
        target: document,
        type: 'keydown',
        filterMapEvent: keyboardEvent =>
          Option.some(Message.PressedKey({ key: keyboardEvent.key })),
      }),

      subscriptions: {
        gameClockTicks: {
          dependencies: model => ({
            isPlaying: model.gameState === 'Playing',
            interval: Math.max(
              MIN_TICK_INTERVAL_MS,
              BASE_TICK_INTERVAL_MS - model.points,
            ),
          }),
          stream: ({
            isPlaying,
            interval,
          }: Readonly<{ isPlaying: boolean; interval: number }>) =>
            Stream.when(
              Stream.tick(Duration.millis(interval)).pipe(
                Stream.drop(1),
                Stream.map(Message.TickedClock),
              ),
              Effect.sync(() => isPlaying),
            ),
        },
      },

      update: {
        PressedKey: (model, { key }) =>
          Match.value(key).pipe(
            Match.whenOr(
              'ArrowUp',
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'w',
              'a',
              's',
              'd',
              moveKey => {
                const nextDirection = Match.value(moveKey).pipe(
                  Match.withReturnType<Direction>(),
                  Match.whenOr('ArrowUp', 'w', () => 'Up'),
                  Match.whenOr('ArrowDown', 's', () => 'Down'),
                  Match.whenOr('ArrowLeft', 'a', () => 'Left'),
                  Match.whenOr('ArrowRight', 'd', () => 'Right'),
                  Match.exhaustive,
                )

                if (model.gameState === 'Playing') {
                  return {
                    model: modifyFields(model, {
                      nextDirection: () => nextDirection,
                    }),
                  }
                } else {
                  return { model }
                }
              },
            ),
            Match.when(' ', () => {
              const nextGameState = Match.value(model.gameState).pipe(
                Match.withReturnType<GameState>(),
                Match.when('NotStarted', () => 'Playing'),
                Match.when('Playing', () => 'Paused'),
                Match.when('Paused', () => 'Playing'),
                Match.when('GameOver', () => 'GameOver'),
                Match.exhaustive,
              )
              return {
                model: modifyFields(model, {
                  gameState: () => nextGameState,
                }),
              }
            }),
            Match.when('r', () => {
              const nextSnake = createSnake(INITIAL_POSITION)

              return {
                model: modifyFields(model, {
                  snake: () => nextSnake,
                  direction: () => INITIAL_DIRECTION,
                  nextDirection: () => INITIAL_DIRECTION,
                  gameState: () => 'NotStarted',
                  points: () => 0,
                }),
                commands: [GenerateApplePosition({ snake: nextSnake })],
              }
            }),
            Match.orElse(() => ({ model })),
          ),

        TickedClock: model => {
          if (model.gameState !== 'Playing') {
            return { model }
          }

          const currentDirection = isOppositeDirection(
            model.direction,
            model.nextDirection,
          )
            ? model.direction
            : model.nextDirection

          const newHead = movePosition(
            Array.headNonEmpty(model.snake),
            currentDirection,
          )
          const willEatApple = positionEquivalence(newHead, model.apple)

          const nextSnake = willEatApple
            ? growSnake(model.snake, currentDirection)
            : moveSnake(model.snake, currentDirection)

          if (hasSelfCollision(nextSnake)) {
            return {
              model: modifyFields(model, {
                gameState: () => 'GameOver',
                highScore: highScore => Math.max(model.points, highScore),
              }),
            }
          }

          const nextModel = modifyFields(model, {
            snake: () => nextSnake,
            direction: () => currentDirection,
            points: points =>
              willEatApple ? points + POINTS_PER_APPLE : points,
          })

          if (willEatApple) {
            return {
              model: nextModel,
              commands: [GenerateApplePosition({ snake: nextSnake })],
            }
          } else {
            return { model: nextModel }
          }
        },

        PausedGame: model => ({
          model: modifyFields(model, {
            gameState: gameState =>
              gameState === 'Playing' ? 'Paused' : 'Playing',
          }),
        }),

        RestartedGame: model => {
          const startPosition: Position = { x: 10, y: 10 }
          const nextSnake = createSnake(startPosition)

          return {
            model: modifyFields(model, {
              snake: () => nextSnake,
              direction: () => 'Right',
              nextDirection: () => 'Right',
              gameState: () => 'NotStarted',
              points: () => 0,
            }),
            commands: [GenerateApplePosition({ snake: nextSnake })],
          }
        },

        CompletedGenerateApplePosition: (model, { position }) => ({
          model: modifyFields(model, { apple: () => position }),
        }),
      },

      commands: {
        GenerateApplePosition: ({ snake }) =>
          randomApplePosition(snake).pipe(
            Effect.map(position =>
              Message.CompletedGenerateApplePosition({ position }),
            ),
          ),
      },

      view,
    }
  }),
)
