import {
  Array,
  Duration,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Subscription from 'foldkit/subscription'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import {
  type KeyPress,
  type TerminalView,
  keyPressStream,
  makeTerminalProgram,
  runTerminal,
  terminal,
} from 'foldkit/terminal'

import { GAME, GAME_SPEED } from './constants'
import { Apple, Direction, Position, Snake } from './domain'

// MODEL

export const GameState = S.Literal(
  'NotStarted',
  'Playing',
  'Paused',
  'GameOver',
)
export type GameState = typeof GameState.Type

const Model = S.Struct({
  snake: Snake.Snake,
  apple: Position.Position,
  direction: Direction.Direction,
  nextDirection: Direction.Direction,
  gameState: GameState,
  points: S.Number,
  highScore: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const TickedClock = m('TickedClock')
const PressedKey = m('PressedKey', { key: S.String })
const PausedGame = m('PausedGame')
const RestartedGame = m('RestartedGame')
const GeneratedApplePosition = m('GeneratedApplePosition', {
  position: Position.Position,
})

export const Message = S.Union(
  TickedClock,
  PressedKey,
  PausedGame,
  RestartedGame,
  GeneratedApplePosition,
)
export type Message = typeof Message.Type

// INIT

const init = (): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const snake = Snake.create(GAME.INITIAL_POSITION)

  return [
    {
      snake,
      apple: { x: 15, y: 15 },
      direction: GAME.INITIAL_DIRECTION,
      nextDirection: GAME.INITIAL_DIRECTION,
      gameState: 'NotStarted',
      points: 0,
      highScore: 0,
    },
    [generateApplePosition(snake)],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      PressedKey: ({ key }) =>
        M.value(key).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
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
                return [
                  evo(model, {
                    nextDirection: () => nextDirection,
                  }),
                  [],
                ]
              } else {
                return [model, []]
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
            return [
              evo(model, {
                gameState: () => nextGameState,
              }),
              [],
            ]
          }),
          M.when('r', () => {
            const nextSnake = Snake.create(GAME.INITIAL_POSITION)

            return [
              evo(model, {
                snake: () => nextSnake,
                direction: () => GAME.INITIAL_DIRECTION,
                nextDirection: () => GAME.INITIAL_DIRECTION,
                gameState: () => 'NotStarted',
                points: () => 0,
              }),
              [generateApplePosition(nextSnake)],
            ]
          }),
          M.orElse(() => [model, []]),
        ),

      TickedClock: () => {
        if (model.gameState !== 'Playing') {
          return [model, []]
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
          return [
            evo(model, {
              gameState: () => 'GameOver',
              highScore: highScore => Math.max(model.points, highScore),
            }),
            [],
          ]
        }

        const commands = willEatApple ? [generateApplePosition(nextSnake)] : []

        return [
          evo(model, {
            snake: () => nextSnake,
            direction: () => currentDirection,
            points: points =>
              willEatApple ? points + GAME.POINTS_PER_APPLE : points,
          }),
          commands,
        ]
      },

      PausedGame: () => [
        evo(model, {
          gameState: gameState =>
            gameState === 'Playing' ? 'Paused' : 'Playing',
        }),
        [],
      ],

      RestartedGame: () => {
        const startPos: Position.Position = { x: 10, y: 10 }
        const nextSnake = Snake.create(startPos)

        return [
          evo(model, {
            snake: () => nextSnake,
            direction: () => 'Right',
            nextDirection: () => 'Right',
            gameState: () => 'NotStarted',
            points: () => 0,
          }),
          [generateApplePosition(nextSnake)],
        ]
      },

      GeneratedApplePosition: ({ position }) => [
        evo(model, {
          apple: () => position,
        }),
        [],
      ],
    }),
  )

// COMMAND

const GenerateApplePosition = Command.define(
  'GenerateApplePosition',
  GeneratedApplePosition,
)

const generateApplePosition = (snake: Snake.Snake) =>
  GenerateApplePosition(
    Apple.generatePosition(snake).pipe(
      Effect.map(position => GeneratedApplePosition({ position })),
    ),
  )

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  gameClock: S.Struct({
    isPlaying: S.Boolean,
    interval: S.Number,
  }),
  keyboard: S.Null,
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  gameClock: {
    modelToDependencies: (model: Model) => ({
      isPlaying: model.gameState === 'Playing',
      interval: Math.max(
        GAME_SPEED.MIN_INTERVAL,
        GAME_SPEED.BASE_INTERVAL - model.points,
      ),
    }),
    dependenciesToStream: (deps: { isPlaying: boolean; interval: number }) =>
      Stream.when(
        Stream.tick(Duration.millis(deps.interval)).pipe(
          Stream.map(TickedClock),
        ),
        () => deps.isPlaying,
      ),
  },

  keyboard: {
    modelToDependencies: () => null,
    dependenciesToStream: () =>
      keyPressStream().pipe(
        Stream.map((keyPress: KeyPress) => PressedKey({ key: keyPress.key })),
      ),
  },
})

// VIEW

const { box, text, Fg, Bg, Bold, Direction: Dir, Border } =
  terminal<Message>()

const CELL_CHAR = '  '

const cellView = (x: number, y: number, model: Model): TerminalView => {
  const isSnakeHead = Position.equivalence({ x, y }, model.snake[0])
  const isSnakeTail = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some(segment => Position.equivalence({ x, y }, segment)),
  )
  const isApple = Position.equivalence({ x, y }, model.apple)

  const cellColor = M.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
    M.when({ isSnakeHead: true }, () => Bg('Green')),
    M.when({ isSnakeTail: true }, () => Bg('BrightGreen')),
    M.when({ isApple: true }, () => Bg('Red')),
    M.orElse(() => Bg('BrightBlack')),
  )

  return text([cellColor], CELL_CHAR)
}

const gridView = (model: Model): TerminalView =>
  box(
    [Border('Round')],
    Array.makeBy(GAME.GRID_SIZE, y =>
      box(
        [Dir('Row')],
        Array.makeBy(GAME.GRID_SIZE, x => cellView(x, y, model)),
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

const view = (model: Model): TerminalView =>
  box(
    [Fg('White')],
    [
      text([Bold, Fg('Green')], ' Snake Game'),
      text([], ''),
      box(
        [Dir('Row')],
        [
          text([Fg('Yellow')], ` Score: ${model.points}`),
          text([], '   '),
          text([Fg('Cyan')], `High Score: ${model.highScore}`),
        ],
      ),
      text([Fg('BrightBlack')], ` ${gameStateView(model.gameState)}`),
      text([], ''),
      gridView(model),
      text([], ''),
      text([Fg('BrightBlack')], ' Arrow keys or WASD to move'),
      text([Fg('BrightBlack')], ' SPACE to pause/start'),
      text([Fg('BrightBlack')], ' R to restart | Ctrl+C to quit'),
    ],
  )

// RUN

const program = makeTerminalProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  title: model => `Snake - Score: ${model.points}`,
})

runTerminal(program)
