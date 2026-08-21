import {
  Array,
  Duration,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { GAME, GAME_SPEED } from './constants'
import { Apple, Direction, Position, Snake } from './domain'

// MODEL

export const GameState = S.Literals([
  'NotStarted',
  'Playing',
  'Paused',
  'GameOver',
])
export type GameState = typeof GameState.Type

export const Model = S.Struct({
  snake: Snake.Snake,
  apple: Position.Position,
  direction: Direction.Direction,
  nextDirection: Direction.Direction,
  gameState: GameState,
  points: S.Number,
  highScore: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  TickedClock: {},
  PressedKey: { key: S.String },
  PausedGame: {},
  RestartedGame: {},
  CompletedGenerateApplePosition: { position: Position.Position },
})

export type Message = typeof Message.Type

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => {
  const snake = Snake.create(GAME.INITIAL_POSITION)

  return {
    model: {
      snake,
      apple: { x: 15, y: 15 },
      direction: GAME.INITIAL_DIRECTION,
      nextDirection: GAME.INITIAL_DIRECTION,
      gameState: 'NotStarted',
      points: 0,
      highScore: 0,
    },
    commands: [GenerateApplePosition({ snake: snake })],
  }
}

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedKey: ({ key }) =>
      M.value(key).pipe(
        M.withReturnType<UpdateReturn>(),
        M.whenOr(
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'a',
          's',
          'd',
          moveKey => {
            const nextDirection = M.value(moveKey).pipe(
              M.withReturnType<Direction.Direction>(),
              M.whenOr('ArrowUp', 'w', () => 'Up'),
              M.whenOr('ArrowDown', 's', () => 'Down'),
              M.whenOr('ArrowLeft', 'a', () => 'Left'),
              M.whenOr('ArrowRight', 'd', () => 'Right'),
              M.exhaustive,
            )

            if (model.gameState === 'Playing') {
              return {
                model: evo(model, {
                  nextDirection: () => nextDirection,
                }),
              }
            } else {
              return { model }
            }
          },
        ),
        M.when(' ', () => {
          const nextGameState = M.value(model.gameState).pipe(
            M.withReturnType<GameState>(),
            M.when('NotStarted', () => 'Playing'),
            M.when('Playing', () => 'Paused'),
            M.when('Paused', () => 'Playing'),
            M.when('GameOver', () => 'GameOver'),
            M.exhaustive,
          )
          return {
            model: evo(model, {
              gameState: () => nextGameState,
            }),
          }
        }),
        M.when('r', () => {
          const nextSnake = Snake.create(GAME.INITIAL_POSITION)

          return {
            model: evo(model, {
              snake: () => nextSnake,
              direction: () => GAME.INITIAL_DIRECTION,
              nextDirection: () => GAME.INITIAL_DIRECTION,
              gameState: () => 'NotStarted',
              points: () => 0,
            }),
            commands: [GenerateApplePosition({ snake: nextSnake })],
          }
        }),
        M.orElse(() => ({ model })),
      ),

    TickedClock: () => {
      if (model.gameState !== 'Playing') {
        return { model }
      }

      const currentDirection = Direction.isOpposite(
        model.direction,
        model.nextDirection,
      )
        ? model.direction
        : model.nextDirection

      const newHead = Position.move(model.snake[0], currentDirection)
      const willEatApple = Position.equivalence(newHead, model.apple)

      const nextSnake = willEatApple
        ? Snake.grow(model.snake, currentDirection)
        : Snake.move(model.snake, currentDirection)

      if (Snake.hasCollision(nextSnake)) {
        return {
          model: evo(model, {
            gameState: () => 'GameOver',
            highScore: highScore => Math.max(model.points, highScore),
          }),
        }
      }

      const commands = willEatApple
        ? [GenerateApplePosition({ snake: nextSnake })]
        : []

      return {
        model: evo(model, {
          snake: () => nextSnake,
          direction: () => currentDirection,
          points: points =>
            willEatApple ? points + GAME.POINTS_PER_APPLE : points,
        }),
        commands,
      }
    },

    PausedGame: () => ({
      model: evo(model, {
        gameState: gameState =>
          gameState === 'Playing' ? 'Paused' : 'Playing',
      }),
    }),

    RestartedGame: () => {
      const startPos: Position.Position = { x: 10, y: 10 }
      const nextSnake = Snake.create(startPos)

      return {
        model: evo(model, {
          snake: () => nextSnake,
          direction: () => 'Right',
          nextDirection: () => 'Right',
          gameState: () => 'NotStarted',
          points: () => 0,
        }),
        commands: [GenerateApplePosition({ snake: nextSnake })],
      }
    },

    CompletedGenerateApplePosition: ({ position }) => ({
      model: evo(model, {
        apple: () => position,
      }),
    }),
  })

// COMMAND

export const GenerateApplePosition = Command.define('GenerateApplePosition', {
  args: { snake: Snake.Snake },
  messages: [Message.CompletedGenerateApplePosition],
  execute: ({ snake }) =>
    Apple.generatePosition(snake).pipe(
      Effect.map(position =>
        Message.CompletedGenerateApplePosition({ position }),
      ),
    ),
})

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  gameClock: entry(
    {
      isPlaying: S.Boolean,
      interval: S.Number,
    },
    {
      modelToDependencies: model => ({
        isPlaying: model.gameState === 'Playing',
        interval: Math.max(
          GAME_SPEED.MIN_INTERVAL,
          GAME_SPEED.BASE_INTERVAL - model.points,
        ),
      }),
      dependenciesToStream: ({ isPlaying, interval }) =>
        Stream.when(
          Stream.tick(Duration.millis(interval)).pipe(
            Stream.map(Message.TickedClock),
          ),
          Effect.sync(() => isPlaying),
        ),
    },
  ),

  keyboard: Subscription.persistent(
    Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
      Stream.mapEffect(keyboardEvent =>
        Effect.sync(() => keyboardEvent.preventDefault()).pipe(
          Effect.as(Message.PressedKey({ key: keyboardEvent.key })),
        ),
      ),
    ),
  ),
}))

// VIEW

const cellClass = (x: number, y: number, model: Model): string => {
  const isSnakeHead = Position.equivalence({ x, y }, model.snake[0])
  const isSnakeTail = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some(segment => Position.equivalence({ x, y }, segment)),
  )
  const isApple = Position.equivalence({ x, y }, model.apple)

  return M.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
    M.when({ isSnakeHead: true }, () => 'bg-green-700'),
    M.when({ isSnakeTail: true }, () => 'bg-green-500'),
    M.when({ isApple: true }, () => 'bg-red-500'),
    M.orElse(() => 'bg-gray-800'),
  )
}

const gridView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('inline-block border-2 border-gray-600')],
    Array.makeBy(GAME.GRID_SIZE, y =>
      h.div(
        [h.Class('flex')],
        Array.makeBy(GAME.GRID_SIZE, x =>
          h.div([h.Class(`w-6 h-6 ${cellClass(x, y, model)}`)]),
        ),
      ),
    ),
  )

const gameStateView = (gameState: GameState): string =>
  M.value(gameState).pipe(
    M.when('NotStarted', () => 'Press SPACE to start'),
    M.when('Playing', () => 'Playing - SPACE to pause'),
    M.when('Paused', () => 'Paused - SPACE to continue'),
    M.when('GameOver', () => 'Game Over - Press R to restart'),
    M.exhaustive,
  )

const instructionsView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('mt-4 text-sm text-gray-400')],
    [
      h.p([], ['Use ARROW KEYS or WASD to move']),
      h.p([], ['SPACE to pause/start']),
      h.p([], ['R to restart']),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
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
